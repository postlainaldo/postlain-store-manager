/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/sw/index.ts":
/*!*************************!*\
  !*** ./src/sw/index.ts ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval(__webpack_require__.ts("/// <reference lib=\"webworker\" />\n// ─── Skip Waiting (auto-update) ───────────────────────────────────────────────\nself.addEventListener(\"message\", (event)=>{\n    var _event_data;\n    if (((_event_data = event.data) === null || _event_data === void 0 ? void 0 : _event_data.type) === \"SKIP_WAITING\") self.skipWaiting();\n});\n// ─── Push Notifications ───────────────────────────────────────────────────────\nself.addEventListener(\"push\", (event)=>{\n    if (!event.data) return;\n    let payload = {};\n    try {\n        payload = event.data.json();\n    } catch (e) {\n        payload = {\n            body: event.data.text()\n        };\n    }\n    var _payload_title;\n    const title = (_payload_title = payload.title) !== null && _payload_title !== void 0 ? _payload_title : \"Postlain\";\n    var _payload_body, _payload_url;\n    const options = {\n        body: (_payload_body = payload.body) !== null && _payload_body !== void 0 ? _payload_body : \"\",\n        icon: \"/icon-192x192.png\",\n        badge: \"/favicon-32x32.png\",\n        data: {\n            url: (_payload_url = payload.url) !== null && _payload_url !== void 0 ? _payload_url : \"/\"\n        },\n        vibrate: [\n            200,\n            100,\n            200\n        ]\n    };\n    event.waitUntil(self.registration.showNotification(title, options));\n});\nself.addEventListener(\"notificationclick\", (event)=>{\n    var _event_notification_data;\n    event.notification.close();\n    var _event_notification_data_url;\n    const url = (_event_notification_data_url = (_event_notification_data = event.notification.data) === null || _event_notification_data === void 0 ? void 0 : _event_notification_data.url) !== null && _event_notification_data_url !== void 0 ? _event_notification_data_url : \"/\";\n    event.waitUntil(self.clients.matchAll({\n        type: \"window\"\n    }).then((clientList)=>{\n        for (const client of clientList){\n            if (\"focus\" in client) return client.focus();\n        }\n        return self.clients.openWindow(url);\n    }));\n});\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvc3cvaW5kZXgudHMiLCJtYXBwaW5ncyI6IkFBQUEsaUNBQWlDO0FBR2pDLGlGQUFpRjtBQUNqRkEsS0FBS0MsZ0JBQWdCLENBQUMsV0FBVyxDQUFDQztRQUM1QkE7SUFBSixJQUFJQSxFQUFBQSxjQUFBQSxNQUFNQyxJQUFJLGNBQVZELGtDQUFBQSxZQUFZRSxJQUFJLE1BQUssZ0JBQWdCSixLQUFLSyxXQUFXO0FBQzNEO0FBRUEsaUZBQWlGO0FBRWpGTCxLQUFLQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUNDO0lBQzdCLElBQUksQ0FBQ0EsTUFBTUMsSUFBSSxFQUFFO0lBQ2pCLElBQUlHLFVBQTJELENBQUM7SUFDaEUsSUFBSTtRQUFFQSxVQUFVSixNQUFNQyxJQUFJLENBQUNJLElBQUk7SUFBSSxFQUFFLFVBQU07UUFBRUQsVUFBVTtZQUFFRSxNQUFNTixNQUFNQyxJQUFJLENBQUNNLElBQUk7UUFBRztJQUFHO1FBRXRFSDtJQUFkLE1BQU1JLFFBQVFKLENBQUFBLGlCQUFBQSxRQUFRSSxLQUFLLGNBQWJKLDRCQUFBQSxpQkFBaUI7UUFFdkJBLGVBR09BO0lBSmYsTUFBTUssVUFBK0I7UUFDbkNILE1BQU1GLENBQUFBLGdCQUFBQSxRQUFRRSxJQUFJLGNBQVpGLDJCQUFBQSxnQkFBZ0I7UUFDdEJNLE1BQU07UUFDTkMsT0FBTztRQUNQVixNQUFNO1lBQUVXLEtBQUtSLENBQUFBLGVBQUFBLFFBQVFRLEdBQUcsY0FBWFIsMEJBQUFBLGVBQWU7UUFBSTtRQUNoQ1MsU0FBUztZQUFDO1lBQUs7WUFBSztTQUFJO0lBQzFCO0lBRUFiLE1BQU1jLFNBQVMsQ0FBQ2hCLEtBQUtpQixZQUFZLENBQUNDLGdCQUFnQixDQUFDUixPQUFPQztBQUM1RDtBQUVBWCxLQUFLQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQ0M7UUFFdEJBO0lBRHBCQSxNQUFNaUIsWUFBWSxDQUFDQyxLQUFLO1FBQ0psQjtJQUFwQixNQUFNWSxNQUFjWixDQUFBQSxnQ0FBQUEsMkJBQUFBLE1BQU1pQixZQUFZLENBQUNoQixJQUFJLGNBQXZCRCwrQ0FBQUEseUJBQXlCWSxHQUFHLGNBQTVCWiwwQ0FBQUEsK0JBQWdDO0lBQ3BEQSxNQUFNYyxTQUFTLENBQ2IsS0FBTUssT0FBTyxDQUFhQyxRQUFRLENBQUM7UUFBRWxCLE1BQU07SUFBUyxHQUFHbUIsSUFBSSxDQUFDQyxDQUFBQTtRQUMxRCxLQUFLLE1BQU1DLFVBQVVELFdBQVk7WUFDL0IsSUFBSSxXQUFXQyxRQUFRLE9BQU8sT0FBeUJDLEtBQUs7UUFDOUQ7UUFDQSxPQUFPLEtBQU1MLE9BQU8sQ0FBYU0sVUFBVSxDQUFDYjtJQUM5QztBQUVKIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGFkbWluXFxEb2N1bWVudHNcXEdpdEh1YlxccG9zdGxhaW4tc3RvcmUtbWFuYWdlclxcc3JjXFxzd1xcaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgbGliPVwid2Vid29ya2VyXCIgLz5cbmRlY2xhcmUgY29uc3Qgc2VsZjogU2VydmljZVdvcmtlckdsb2JhbFNjb3BlO1xuXG4vLyDilIDilIDilIAgU2tpcCBXYWl0aW5nIChhdXRvLXVwZGF0ZSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIChldmVudDogRXh0ZW5kYWJsZU1lc3NhZ2VFdmVudCkgPT4ge1xuICBpZiAoZXZlbnQuZGF0YT8udHlwZSA9PT0gXCJTS0lQX1dBSVRJTkdcIikgc2VsZi5za2lwV2FpdGluZygpO1xufSk7XG5cbi8vIOKUgOKUgOKUgCBQdXNoIE5vdGlmaWNhdGlvbnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcInB1c2hcIiwgKGV2ZW50OiBQdXNoRXZlbnQpID0+IHtcbiAgaWYgKCFldmVudC5kYXRhKSByZXR1cm47XG4gIGxldCBwYXlsb2FkOiB7IHRpdGxlPzogc3RyaW5nOyBib2R5Pzogc3RyaW5nOyB1cmw/OiBzdHJpbmcgfSA9IHt9O1xuICB0cnkgeyBwYXlsb2FkID0gZXZlbnQuZGF0YS5qc29uKCk7IH0gY2F0Y2ggeyBwYXlsb2FkID0geyBib2R5OiBldmVudC5kYXRhLnRleHQoKSB9OyB9XG5cbiAgY29uc3QgdGl0bGUgPSBwYXlsb2FkLnRpdGxlID8/IFwiUG9zdGxhaW5cIjtcbiAgY29uc3Qgb3B0aW9uczogTm90aWZpY2F0aW9uT3B0aW9ucyA9IHtcbiAgICBib2R5OiBwYXlsb2FkLmJvZHkgPz8gXCJcIixcbiAgICBpY29uOiBcIi9pY29uLTE5MngxOTIucG5nXCIsXG4gICAgYmFkZ2U6IFwiL2Zhdmljb24tMzJ4MzIucG5nXCIsXG4gICAgZGF0YTogeyB1cmw6IHBheWxvYWQudXJsID8/IFwiL1wiIH0sXG4gICAgdmlicmF0ZTogWzIwMCwgMTAwLCAyMDBdLFxuICB9O1xuXG4gIGV2ZW50LndhaXRVbnRpbChzZWxmLnJlZ2lzdHJhdGlvbi5zaG93Tm90aWZpY2F0aW9uKHRpdGxlLCBvcHRpb25zKSk7XG59KTtcblxuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwibm90aWZpY2F0aW9uY2xpY2tcIiwgKGV2ZW50OiBOb3RpZmljYXRpb25FdmVudCkgPT4ge1xuICBldmVudC5ub3RpZmljYXRpb24uY2xvc2UoKTtcbiAgY29uc3QgdXJsOiBzdHJpbmcgPSBldmVudC5ub3RpZmljYXRpb24uZGF0YT8udXJsID8/IFwiL1wiO1xuICBldmVudC53YWl0VW50aWwoXG4gICAgKHNlbGYuY2xpZW50cyBhcyBDbGllbnRzKS5tYXRjaEFsbCh7IHR5cGU6IFwid2luZG93XCIgfSkudGhlbihjbGllbnRMaXN0ID0+IHtcbiAgICAgIGZvciAoY29uc3QgY2xpZW50IG9mIGNsaWVudExpc3QpIHtcbiAgICAgICAgaWYgKFwiZm9jdXNcIiBpbiBjbGllbnQpIHJldHVybiAoY2xpZW50IGFzIFdpbmRvd0NsaWVudCkuZm9jdXMoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAoc2VsZi5jbGllbnRzIGFzIENsaWVudHMpLm9wZW5XaW5kb3codXJsKTtcbiAgICB9KVxuICApO1xufSk7XG4iXSwibmFtZXMiOlsic2VsZiIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsImRhdGEiLCJ0eXBlIiwic2tpcFdhaXRpbmciLCJwYXlsb2FkIiwianNvbiIsImJvZHkiLCJ0ZXh0IiwidGl0bGUiLCJvcHRpb25zIiwiaWNvbiIsImJhZGdlIiwidXJsIiwidmlicmF0ZSIsIndhaXRVbnRpbCIsInJlZ2lzdHJhdGlvbiIsInNob3dOb3RpZmljYXRpb24iLCJub3RpZmljYXRpb24iLCJjbG9zZSIsImNsaWVudHMiLCJtYXRjaEFsbCIsInRoZW4iLCJjbGllbnRMaXN0IiwiY2xpZW50IiwiZm9jdXMiLCJvcGVuV2luZG93Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/sw/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/sw/index.ts");
/******/ 	
/******/ })()
;