// WebGL Debug Utilities - simplified version for CSE 160
// Based on the Khronos WebGL debug helper

(function() {

  /**
   * Wrapped logging function.
   */
  var log = function(msg) {
    if (window.console && window.console.log) {
      window.console.log(msg);
    }
  };

  /**
   * Which arguments are enums.
   * @type {!Object.<number, string>}
   */
  var glValidEnumContexts = {
    // Generic error values
    'getError': { 0: true }
  };

  /**
   * Map of numbers to names.
   * @type {Object}
   */
  var glEnums = null;

  /**
   * Initialize this module. Safe to call more than once.
   * @param {!WebGLRenderingContext} ctx A WebGL context. If
   *    temporary, make sure it is destroyed after init.
   */
  function init(ctx) {
    if (glEnums == null) {
      glEnums = { };
      for (var propertyName in ctx) {
        if (typeof ctx[propertyName] == 'number') {
          glEnums[ctx[propertyName]] = propertyName;
        }
      }
    }
  }

  /**
   * Checks the utils have been initialized.
   */
  function checkInit() {
    if (glEnums == null) {
      throw 'WebGLDebugUtils.init(ctx) not called';
    }
  }

  /**
   * Returns true or false if value matches any WebGL enum
   * @param {*} value Value to check if it might be an enum.
   * @return {boolean} True if value matches one of the WebGL defined enums
   */
  function mightBeEnum(value) {
    checkInit();
    return (glEnums[value] !== undefined);
  }

  /**
   * Gets an string version of an WebGL enum.
   *
   * Example:
   *   WebGLDebugUtil.init(ctx);
   *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
   *
   * @param {number} value Value to return an enum for
   * @return {string} The string version of the enum.
   */
  function glEnumToString(value) {
    checkInit();
    var name = glEnums[value];
    return (name !== undefined) ? name :
        ("*UNKNOWN WebGL ENUM (0x" + value.toString(16) + ")");
  }

  /**
   * Returns the string version of a WebGL argument.
   * Attempts to convert enum arguments to strings.
   * @param {string} functionName the name of the WebGL function.
   * @param {number} argumentIndx the index of the argument.
   * @param {*} value The value of the argument.
   * @return {string} The value as a string.
   */
  function glFunctionArgToString(functionName, argumentIndx, value) {
    var funcInfo = glValidEnumContexts[functionName];
    if (funcInfo !== undefined) {
      var argType = funcInfo[argumentIndx];
      if (argType) {
        return glEnumToString(value);
      }
    }
    return value.toString();
  }

  /**
   * Given a WebGL context returns a wrapped context that calls
   * gl.getError after every command and calls a function if the
   * result is not gl.NO_ERROR.
   *
   * @param {!WebGLRenderingContext} ctx The webgl context to
   *        wrap.
   * @param {!function(err, funcName, args): void} opt_onErrorFunc The function
   *        to call when gl.getError returns an error. If not specified the
   *        default function calls console.log with a message.
   */
  function makeDebugContext(ctx, opt_onErrorFunc) {
    init(ctx);
    opt_onErrorFunc = opt_onErrorFunc || function(err, funcName, args) {
      // apparently we can't do args.join(",");
      var argStr = "";
      for (var ii = 0; ii < args.length; ++ii) {
        argStr += ((ii == 0) ? '' : ', ') +
            glFunctionArgToString(funcName, ii, args[ii]);
      }
      log("WebGL error "+ glEnumToString(err) + " in "+ funcName +
          "(" + argStr + ")");
    };

    // Holds booleans for each GL error so after we get the error ourselves
    // we can still return it to the client app.
    var glErrorShadow = { };

    var wrapper = {};
    for (var propertyName in ctx) {
      if (typeof ctx[propertyName] == 'function') {
        wrapper[propertyName] = (function(propertyName) {
          return function() {
            var result = ctx[propertyName].apply(ctx, arguments);
            var err = ctx.getError();
            if (err != 0) {
              glErrorShadow[err] = true;
              opt_onErrorFunc(err, propertyName, arguments);
            }
            return result;
          };
        })(propertyName);
      } else {
        wrapper[propertyName] = ctx[propertyName];
      }
    }

    wrapper.getError = function() {
      for (var err in glErrorShadow) {
        if (glErrorShadow.hasOwnProperty(err)) {
          if (glErrorShadow[err]) {
            glErrorShadow[err] = false;
            return err;
          }
        }
      }
      return ctx.NO_ERROR;
    };

    return wrapper;
  }

  window.WebGLDebugUtils = {
    init: init,
    mightBeEnum: mightBeEnum,
    glEnumToString: glEnumToString,
    glFunctionArgToString: glFunctionArgToString,
    makeDebugContext: makeDebugContext
  };

}());
