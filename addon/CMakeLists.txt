project (addon)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_VERBOSE_BUILD TRUE)
cmake_minimum_required(VERSION 3.16)
add_definitions(-DNAPI_DISABLE_CPP_EXCEPTIONS)

include_directories(${CMAKE_JS_INC})
include_directories(${CMAKE_SOURCE_DIR}/gn/src)
file(GLOB SOURCE_FILES "addon.cc")
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Libs
set(LIBS
        ${CMAKE_JS_LIB}
        ${CMAKE_SOURCE_DIR}/gn/out/${NODE_ARCH}/base${CMAKE_STATIC_LIBRARY_SUFFIX}
        ${CMAKE_SOURCE_DIR}/gn/out/${NODE_ARCH}/gn_lib${CMAKE_STATIC_LIBRARY_SUFFIX}
        )
if (UNIX AND NOT APPLE)
        list(INSERT LIBS 0 -Wl,--start-group)
        list(APPEND LIBS -Wl,--end-group)
endif()
if (WIN32)
        list(APPEND LIBS ws2_32.lib shlwapi.lib)
endif()
target_link_libraries(${PROJECT_NAME} ${LIBS})

# Compiler options
if(MSVC)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /W4 /WX /wd4100 /wd4127")
  set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} /MT")
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Werror -Wno-unused-parameter -Wno-deprecated-copy")
endif()

# Include node-addon-api wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR})
