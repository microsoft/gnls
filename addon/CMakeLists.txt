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

target_link_libraries(
        ${PROJECT_NAME}
        -Wl,--start-group
        ${CMAKE_JS_LIB}
        ${CMAKE_SOURCE_DIR}/gn/out/${NODE_ARCH}/base${CMAKE_STATIC_LIBRARY_SUFFIX}
        ${CMAKE_SOURCE_DIR}/gn/out/${NODE_ARCH}/gn_lib${CMAKE_STATIC_LIBRARY_SUFFIX}
        -Wl,--end-group
        )

# Include node-addon-api wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR})
