"use strict";
// Re-export the React Navigation fork's public surface. Expo Router intentionally
// shadows several names with its own wrappers/types, so they are omitted here:
//   - `useNavigation`, `useFocusEffect`, `useIsFocused`, `useNavigationContainerRef`
//     (Expo Router wrappers are re-exported from `src/exports.ts`)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabRouter = exports.TabActions = exports.StackRouter = exports.StackActions = exports.DrawerRouter = exports.DrawerActions = exports.CommonActions = exports.BaseRouter = exports.useNavigationBuilder = exports.createNavigatorFactory = exports.useNavigationState = exports.useScrollToTop = exports.useRoute = exports.useRoutePath = exports.useLocale = exports.useLinkBuilder = exports.UNSTABLE_UnhandledLinkingContext = exports.ServerContainer = exports.LocaleDirContext = exports.LinkingContext = exports.usePreventRemove = exports.useTheme = exports.DefaultTheme = exports.DarkTheme = exports.validatePathConfig = exports.useStateForPath = exports.usePreventRemoveContext = exports.useNavigationIndependentTree = exports.ThemeProvider = exports.ThemeContext = exports.PrivateValueStore = exports.PreventRemoveProvider = exports.PreventRemoveContext = exports.NavigationRouteContext = exports.NavigationProvider = exports.NavigationMetaContext = exports.NavigationIndependentTree = exports.NavigationHelpersContext = exports.NavigationContext = exports.NavigationContainerRefContext = exports.getStateFromPath = exports.getPathFromState = exports.getFocusedRouteNameFromRoute = exports.getActionFromState = exports.findFocusedRoute = exports.CurrentRenderContext = exports.createPathConfigForStaticNavigation = exports.createNavigationContainerRef = exports.createComponentForStaticNavigation = exports.BaseNavigationContainer = void 0;
var native_1 = require("./native");
Object.defineProperty(exports, "BaseNavigationContainer", { enumerable: true, get: function () { return native_1.BaseNavigationContainer; } });
Object.defineProperty(exports, "createComponentForStaticNavigation", { enumerable: true, get: function () { return native_1.createComponentForStaticNavigation; } });
Object.defineProperty(exports, "createNavigationContainerRef", { enumerable: true, get: function () { return native_1.createNavigationContainerRef; } });
Object.defineProperty(exports, "createPathConfigForStaticNavigation", { enumerable: true, get: function () { return native_1.createPathConfigForStaticNavigation; } });
Object.defineProperty(exports, "CurrentRenderContext", { enumerable: true, get: function () { return native_1.CurrentRenderContext; } });
Object.defineProperty(exports, "findFocusedRoute", { enumerable: true, get: function () { return native_1.findFocusedRoute; } });
Object.defineProperty(exports, "getActionFromState", { enumerable: true, get: function () { return native_1.getActionFromState; } });
Object.defineProperty(exports, "getFocusedRouteNameFromRoute", { enumerable: true, get: function () { return native_1.getFocusedRouteNameFromRoute; } });
Object.defineProperty(exports, "getPathFromState", { enumerable: true, get: function () { return native_1.getPathFromState; } });
Object.defineProperty(exports, "getStateFromPath", { enumerable: true, get: function () { return native_1.getStateFromPath; } });
Object.defineProperty(exports, "NavigationContainerRefContext", { enumerable: true, get: function () { return native_1.NavigationContainerRefContext; } });
Object.defineProperty(exports, "NavigationContext", { enumerable: true, get: function () { return native_1.NavigationContext; } });
Object.defineProperty(exports, "NavigationHelpersContext", { enumerable: true, get: function () { return native_1.NavigationHelpersContext; } });
Object.defineProperty(exports, "NavigationIndependentTree", { enumerable: true, get: function () { return native_1.NavigationIndependentTree; } });
Object.defineProperty(exports, "NavigationMetaContext", { enumerable: true, get: function () { return native_1.NavigationMetaContext; } });
Object.defineProperty(exports, "NavigationProvider", { enumerable: true, get: function () { return native_1.NavigationProvider; } });
Object.defineProperty(exports, "NavigationRouteContext", { enumerable: true, get: function () { return native_1.NavigationRouteContext; } });
Object.defineProperty(exports, "PreventRemoveContext", { enumerable: true, get: function () { return native_1.PreventRemoveContext; } });
Object.defineProperty(exports, "PreventRemoveProvider", { enumerable: true, get: function () { return native_1.PreventRemoveProvider; } });
Object.defineProperty(exports, "PrivateValueStore", { enumerable: true, get: function () { return native_1.PrivateValueStore; } });
Object.defineProperty(exports, "ThemeContext", { enumerable: true, get: function () { return native_1.ThemeContext; } });
Object.defineProperty(exports, "ThemeProvider", { enumerable: true, get: function () { return native_1.ThemeProvider; } });
Object.defineProperty(exports, "useNavigationIndependentTree", { enumerable: true, get: function () { return native_1.useNavigationIndependentTree; } });
Object.defineProperty(exports, "usePreventRemoveContext", { enumerable: true, get: function () { return native_1.usePreventRemoveContext; } });
Object.defineProperty(exports, "useStateForPath", { enumerable: true, get: function () { return native_1.useStateForPath; } });
Object.defineProperty(exports, "validatePathConfig", { enumerable: true, get: function () { return native_1.validatePathConfig; } });
Object.defineProperty(exports, "DarkTheme", { enumerable: true, get: function () { return native_1.DarkTheme; } });
Object.defineProperty(exports, "DefaultTheme", { enumerable: true, get: function () { return native_1.DefaultTheme; } });
Object.defineProperty(exports, "useTheme", { enumerable: true, get: function () { return native_1.useTheme; } });
Object.defineProperty(exports, "usePreventRemove", { enumerable: true, get: function () { return native_1.usePreventRemove; } });
Object.defineProperty(exports, "LinkingContext", { enumerable: true, get: function () { return native_1.LinkingContext; } });
Object.defineProperty(exports, "LocaleDirContext", { enumerable: true, get: function () { return native_1.LocaleDirContext; } });
Object.defineProperty(exports, "ServerContainer", { enumerable: true, get: function () { return native_1.ServerContainer; } });
Object.defineProperty(exports, "UNSTABLE_UnhandledLinkingContext", { enumerable: true, get: function () { return native_1.UNSTABLE_UnhandledLinkingContext; } });
Object.defineProperty(exports, "useLinkBuilder", { enumerable: true, get: function () { return native_1.useLinkBuilder; } });
Object.defineProperty(exports, "useLocale", { enumerable: true, get: function () { return native_1.useLocale; } });
Object.defineProperty(exports, "useRoutePath", { enumerable: true, get: function () { return native_1.useRoutePath; } });
Object.defineProperty(exports, "useRoute", { enumerable: true, get: function () { return native_1.useRoute; } });
Object.defineProperty(exports, "useScrollToTop", { enumerable: true, get: function () { return native_1.useScrollToTop; } });
Object.defineProperty(exports, "useNavigationState", { enumerable: true, get: function () { return native_1.useNavigationState; } });
Object.defineProperty(exports, "createNavigatorFactory", { enumerable: true, get: function () { return native_1.createNavigatorFactory; } });
Object.defineProperty(exports, "useNavigationBuilder", { enumerable: true, get: function () { return native_1.useNavigationBuilder; } });
Object.defineProperty(exports, "BaseRouter", { enumerable: true, get: function () { return native_1.BaseRouter; } });
Object.defineProperty(exports, "CommonActions", { enumerable: true, get: function () { return native_1.CommonActions; } });
Object.defineProperty(exports, "DrawerActions", { enumerable: true, get: function () { return native_1.DrawerActions; } });
Object.defineProperty(exports, "DrawerRouter", { enumerable: true, get: function () { return native_1.DrawerRouter; } });
Object.defineProperty(exports, "StackActions", { enumerable: true, get: function () { return native_1.StackActions; } });
Object.defineProperty(exports, "StackRouter", { enumerable: true, get: function () { return native_1.StackRouter; } });
Object.defineProperty(exports, "TabActions", { enumerable: true, get: function () { return native_1.TabActions; } });
Object.defineProperty(exports, "TabRouter", { enumerable: true, get: function () { return native_1.TabRouter; } });
__exportStar(require("./elements"), exports);
//# sourceMappingURL=index.js.map