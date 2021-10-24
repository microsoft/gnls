#include <map>
#include <memory>
#include <stack>
#include <string>
#include <utility>
#include <vector>

#if defined(_MSC_VER)
#pragma warning(push)
#pragma warning(disable : 4244)
#endif
#include <napi.h>

#include <base/files/file_util.h>
#include <gn/command_format.h>
#include <gn/filesystem_utils.h>
#include <gn/functions.h>
#include <gn/input_file.h>
#include <gn/parser.h>
#include <gn/tokenizer.h>
#include <gn/variables.h>
#if defined(_MSC_VER)
#pragma warning(pop)
#endif

struct GNContext {
  const base::FilePath* root = nullptr;
  const Token* token = nullptr;
  const FunctionCallNode* function = nullptr;
  const IdentifierNode* variable = nullptr;
};

struct GNScope {
  std::vector<const FunctionCallNode*> declares;
};

template <typename T>
static auto JSValue(Napi::Env env, const std::vector<T>& vector)
    -> Napi::Value {
  auto result = Napi::Array::New(env);
  for (const auto& item : vector) {
    result[result.Length()] = JSValue(env, item);
  }
  return result;
}

static auto JSValue(Napi::Env env, const Location& location) -> Napi::Value {
  auto result = Napi::Object::New(env);
  result["file"] = location.file()->name().value();
  result["line"] = location.line_number();
  result["column"] = location.column_number();
  return result;
}

static auto JSValue(Napi::Env env, const LocationRange& range) -> Napi::Value {
  auto result = Napi::Object::New(env);
  result["begin"] = JSValue(env, range.begin());
  result["end"] = JSValue(env, range.end());
  return result;
}

static auto JSValue(Napi::Env env, const Err& err) -> Napi::Value {
  auto result = Napi::Object::New(env);
  result["location"] = JSValue(env, err.location());
  result["ranges"] = JSValue(env, err.ranges());
  result["message"] = err.message();
  result["help"] = err.help_text();
  return result;
}

static auto JSValue(Napi::Env env, const GNContext& context) -> Napi::Value {
  auto result = Napi::Object::New(env);
  result["root"] = context.root->value();
  if (context.token != nullptr) {
    auto token = Napi::Object::New(env);
    switch (context.token->type()) {
      case Token::Type::IDENTIFIER:
        token["type"] = "identifier";
        break;
      case Token::Type::INTEGER:
      case Token::Type::STRING:
      case Token::Type::TRUE_TOKEN:
      case Token::Type::FALSE_TOKEN:
        token["type"] = "literal";
        break;
      default:
        token["type"] = "";
        break;
    }
    token["value"] = std::string(context.token->value());
    token["range"] = JSValue(env, context.token->range());
    result["token"] = token;
  }
  if (context.function != nullptr) {
    auto arguments = Napi::Array::New(env);
    for (const auto& argument : context.function->args()->contents()) {
      if (const auto* literal = argument->AsLiteral()) {
        arguments[arguments.Length()] = std::string(literal->value().value());
      } else {
        arguments[arguments.Length()] = "";
      }
    }
    auto function = Napi::Object::New(env);
    function["name"] = std::string(context.function->function().value());
    function["arguments"] = arguments;
    result["function"] = function;
  }
  if (context.variable != nullptr) {
    result["variable"] = std::string(context.variable->value().value());
  }
  return result;
}

static auto JSValue(Napi::Env env, const GNScope& scope) -> Napi::Value {
  auto result = Napi::Object::New(env);
  auto declares = Napi::Array::New(env);
  for (const auto& node : scope.declares) {
    auto arguments = Napi::Array::New(env);
    for (const auto& argument : node->args()->contents()) {
      if (const auto* literal = argument->AsLiteral()) {
        arguments[arguments.Length()] = std::string(literal->value().value());
      } else {
        arguments[arguments.Length()] = "";
      }
    }
    auto declare = Napi::Object::New(env);
    declare["function"] = std::string(node->function().value());
    declare["arguments"] = arguments;
    declare["range"] =
        JSValue(env, LocationRange(node->function().range().begin(),
                                   node->block()->GetRange().begin()));
    declares[declares.Length()] = declare;
  }
  result["declares"] = declares;
  return result;
}

class GNDocument {
 public:
  explicit GNDocument(const std::string& file)
      : file_(SourceFile(file)), root_(FindRoot()) {}
  ~GNDocument() = default;
  GNDocument(const GNDocument&) = delete;
  GNDocument(GNDocument&&) = delete;
  auto operator=(const GNDocument&) -> GNDocument& = delete;
  auto operator=(GNDocument&&) -> GNDocument& = delete;

  [[nodiscard]] auto GetError() const -> const Err& { return err_; }
  [[nodiscard]] auto GetTokens() const -> const std::vector<Token>& {
    return tokens_;
  }
  [[nodiscard]] auto GetNode() const -> const std::unique_ptr<ParseNode>& {
    return node_;
  }

  auto UpdateContent(const std::string& content) {
    file_.SetContents(content);
    Err err;
    auto tokens = Tokenizer::Tokenize(&file_, &err);
    auto node = err.has_error() ? nullptr : Parser::Parse(tokens, &err);
    if (!err.has_error()) {
      tokens_ = std::move(tokens);
      node_ = std::move(node);
    }
    err_ = err;
  }

  auto AnalyzeContext(int line, int column) -> GNContext {
    GNContext context;
    context.root = &root_;
    auto nodes = TraversePath(Location(&file_, line, column, 0));
    if (const auto* last = nodes.empty() ? nullptr : nodes.back()) {
      if (const auto* accessor = last->AsAccessor()) {
        context.token = &accessor->base();
      } else if (const auto* function_call = last->AsFunctionCall()) {
        context.token = &function_call->function();
      } else if (const auto* identifier = last->AsIdentifier()) {
        context.token = &identifier->value();
      } else if (const auto* literal = last->AsLiteral()) {
        context.token = &literal->value();
      }
    }
    for (auto it = nodes.rbegin(); it != nodes.rend(); it++) {
      const auto* current = *it;
      const auto* previous = it > nodes.rbegin() ? *(it - 1) : nullptr;
      if (context.function == nullptr) {
        const auto* function_call = current->AsFunctionCall();
        const auto* block = previous != nullptr ? previous->AsBlock() : nullptr;
        if (function_call != nullptr && block != nullptr) {
          context.function = function_call;
          break;
        }
      }
      if (context.variable == nullptr) {
        const auto* binary_op = current->AsBinaryOp();
        const auto* identifier =
            binary_op != nullptr ? binary_op->left()->AsIdentifier() : nullptr;
        if (identifier != nullptr) {
          context.variable = identifier;
          continue;
        }
      }
    }
    return context;
  }

  auto ParseScope() -> GNScope {
    GNScope scope;
    std::stack<const ParseNode*> nodes;
    nodes.push(node_.get());
    while (!nodes.empty()) {
      const auto* node = nodes.top();
      nodes.pop();
      if (node == nullptr) {
        continue;
      }
      if (const auto* block = node->AsBlock()) {
        for (auto item = block->statements().rbegin();
             item != block->statements().rend(); item++) {
          nodes.push(item->get());
        }
      } else if (const auto* condition = node->AsCondition()) {
        nodes.push(condition->if_false());
        nodes.push(condition->if_true());
      } else if (const auto* function_call = node->AsFunctionCall()) {
        if (function_call->block() != nullptr) {
          scope.declares.push_back(function_call);
        }
      }
    }
    return scope;
  }

  auto FormatCode() -> std::string {
    std::string result;
    if (!err_.has_error() &&
        commands::FormatStringToString(file_.contents(),
                                       commands::TreeDumpMode::kInactive,
                                       &result, nullptr)) {
      return result;
    }
    return {};
  }

 private:
  auto FindRoot() -> base::FilePath {
    base::FilePath current =
        UTF8ToFilePath(file_.dir().SourceWithNoTrailingSlash());
    for (;;) {
      base::FilePath file = current.Append(FILE_PATH_LITERAL(".gn"));
      if (base::PathExists(file)) {
        return current;
      }
      base::FilePath upper = current.StripTrailingSeparators().DirName();
      if (current == upper) {
        break;
      }
      current = std::move(upper);
    }
    return {};
  }

  auto TraversePath(const Location& location) -> std::vector<const ParseNode*> {
    std::vector<const ParseNode*> result;
    const ParseNode* current = nullptr;
    auto contain = [](const LocationRange& range, const Location& location) {
      return !(location < range.begin()) && (location < range.end());
    };
    auto next = [&](const ParseNode* node) {
      if (node != nullptr && contain(node->GetRange(), location)) {
        result.push_back(node);
        current = node;
        return true;
      }
      current = nullptr;
      return false;
    };
    next(node_.get());
    while (current != nullptr) {
      if (const auto* accessor = current->AsAccessor()) {
        next(accessor->subscript()) || next(accessor->member());
      } else if (const auto* binary_op = current->AsBinaryOp()) {
        next(binary_op->left()) || next(binary_op->right());
      } else if (const auto* block = current->AsBlock()) {
        next(nullptr);
        for (const auto& statement : block->statements()) {
          if (next(statement.get())) {
            break;
          }
        }
      } else if (const auto* condition = current->AsCondition()) {
        next(condition->condition()) || next(condition->if_true()) ||
            next(condition->if_false());
      } else if (const auto* function_call = current->AsFunctionCall()) {
        next(function_call->args()) || next(function_call->block());
      } else if (const auto* list = current->AsList()) {
        next(nullptr);
        for (const auto& content : list->contents()) {
          if (next(content.get())) {
            break;
          }
        }
      } else if (const auto* unary_op = current->AsUnaryOp()) {
        next(unary_op->operand());
      } else {
        break;
      }
    }
    return result;
  }

  InputFile file_;
  base::FilePath root_;
  Err err_;
  std::vector<Token> tokens_;
  std::unique_ptr<ParseNode> node_;
};

class GNAddon : public Napi::Addon<GNAddon> {
 public:
  GNAddon(Napi::Env env, Napi::Object exports) {
    DefineAddon(exports, {InstanceMethod("update", &GNAddon::Update)});
    DefineAddon(exports, {InstanceMethod("close", &GNAddon::Close)});
    DefineAddon(exports, {InstanceMethod("validate", &GNAddon::Validate)});
    DefineAddon(exports, {InstanceMethod("analyze", &GNAddon::Analyze)});
    DefineAddon(exports, {InstanceMethod("parse", &GNAddon::Parse)});
    DefineAddon(exports, {InstanceMethod("format", &GNAddon::Format)});
    DefineAddon(exports, {InstanceMethod("help", &GNAddon::Help)});
  }

 private:
  auto Update(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string file = info[0].As<Napi::String>();
    std::string content = info[1].As<Napi::String>();
    auto& document = documents_.try_emplace(file, file).first->second;
    document.UpdateContent(content);
    return env.Null();
  }

  auto Close(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string file = info[0].As<Napi::String>();
    documents_.erase(file);
    return env.Null();
  }

  auto Validate(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string file = info[0].As<Napi::String>();
    auto item = documents_.find(file);
    if (item != documents_.end()) {
      auto& document = item->second;
      const auto& err = document.GetError();
      return err.has_error() ? JSValue(env, err) : env.Null();
    }
    return env.Null();
  }

  auto Analyze(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string file = info[0].As<Napi::String>();
    int line = info[1].As<Napi::Number>();
    int column = info[2].As<Napi::Number>();
    auto item = documents_.find(file);
    if (item != documents_.end()) {
      auto& document = item->second;
      auto context = document.AnalyzeContext(line, column);
      return JSValue(env, context);
    }
    return env.Null();
  }

  auto Parse(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string file = info[0].As<Napi::String>();
    auto item = documents_.find(file);
    if (item != documents_.end()) {
      auto& document = item->second;
      auto scope = document.ParseScope();
      return JSValue(env, scope);
    }
    if (info.Length() > 1) {
      std::string content = info[1].As<Napi::String>();
      GNDocument document(file);
      document.UpdateContent(content);
      auto scope = document.ParseScope();
      return JSValue(env, scope);
    }
    return env.Null();
  }

  auto Format(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string file = info[0].As<Napi::String>();
    auto item = documents_.find(file);
    if (item != documents_.end()) {
      auto& document = item->second;
      return Napi::String::New(env, document.FormatCode());
    }
    if (info.Length() > 1) {
      std::string content = info[1].As<Napi::String>();
      GNDocument document(file);
      document.UpdateContent(content);
      return Napi::String::New(env, document.FormatCode());
    }
    return env.Null();
  }

  auto Help(const Napi::CallbackInfo& info) -> Napi::Value {
    auto env = info.Env();
    std::string type = info[0].As<Napi::String>();
    std::string name = info[1].As<Napi::String>();
    std::string basic;
    std::string full;
    std::string link;
    if (type == "function" || type == "all") {
      const auto& functions = functions::GetFunctions();
      auto function = functions.find(name);
      if (function != functions.end()) {
        basic = function->second.help_short;
        full = function->second.help;
        link = link_ + "#func_" + name;
      }
    }
    if (type == "variable" || type == "all") {
      const auto& builtin_variables = variables::GetBuiltinVariables();
      const auto& target_variables = variables::GetTargetVariables();
      auto builtin_variable = builtin_variables.find(name);
      auto target_variable = target_variables.find(name);
      if (builtin_variable != builtin_variables.end()) {
        basic = builtin_variable->second.help_short;
        full = builtin_variable->second.help;
        link = link_ + "#var_" + name;
      } else if (target_variable != target_variables.end()) {
        basic = target_variable->second.help_short;
        full = target_variable->second.help;
        link = link_ + "#var_" + name;
      }
    }
    auto result = Napi::Object::New(env);
    result["basic"] = basic;
    result["full"] = full;
    result["link"] = link;
    return result;
  }

  std::map<std::string, GNDocument> documents_;
  std::string link_ = "https://gn.googlesource.com/gn/+/main/docs/reference.md";
};

NODE_API_ADDON(GNAddon)  // NOLINT
