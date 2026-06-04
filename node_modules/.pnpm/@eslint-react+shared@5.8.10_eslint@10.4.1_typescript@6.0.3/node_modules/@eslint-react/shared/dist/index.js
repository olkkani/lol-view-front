import module from "node:module";
import path from "node:path";
import { P, match } from "ts-pattern";
import { z } from "zod/v4";

//#region ../../.pkgs/eff/dist/index.js
/**
* Returns its argument.
*
* @param x - The value to return.
* @returns The input value unchanged.
*/
function identity(x) {
	return x;
}
/**
* Creates a function that can be used in a data-last (aka `pipe`able) or
* data-first style.
*
* The first parameter to `dual` is either the arity of the uncurried function
* or a predicate that determines if the function is being used in a data-first
* or data-last style.
*
* Using the arity is the most common use case, but there are some cases where
* you may want to use a predicate. For example, if you have a function that
* takes an optional argument, you can use a predicate to determine if the
* function is being used in a data-first or data-last style.
*
* You can pass either the arity of the uncurried function or a predicate
* which determines if the function is being used in a data-first or
* data-last style.
*
* **Example** (Using arity to determine data-first or data-last style)
*
* ```ts
* import { dual, pipe } from "effect/Function"
*
* const sum = dual<
*   (that: number) => (self: number) => number,
*   (self: number, that: number) => number
* >(2, (self, that) => self + that)
*
* console.log(sum(2, 3)) // 5
* console.log(pipe(2, sum(3))) // 5
* ```
*
* **Example** (Using call signatures to define the overloads)
*
* ```ts
* import { dual, pipe } from "effect/Function"
*
* const sum: {
*   (that: number): (self: number) => number
*   (self: number, that: number): number
* } = dual(2, (self: number, that: number): number => self + that)
*
* console.log(sum(2, 3)) // 5
* console.log(pipe(2, sum(3))) // 5
* ```
*
* **Example** (Using a predicate to determine data-first or data-last style)
*
* ```ts
* import { dual, pipe } from "effect/Function"
*
* const sum = dual<
*   (that: number) => (self: number) => number,
*   (self: number, that: number) => number
* >(
*   (args) => args.length === 2,
*   (self, that) => self + that
* )
*
* console.log(sum(2, 3)) // 5
* console.log(pipe(2, sum(3))) // 5
* ```
*
* @param arity - The arity of the uncurried function or a predicate that determines if the function is being used in a data-first or data-last style.
* @param body - The function to be curried.
* @since 1.0.0
*/
const dual = function(arity, body) {
	if (typeof arity === "function") return function() {
		return arity(arguments) ? body.apply(this, arguments) : ((self) => body(self, ...arguments));
	};
	switch (arity) {
		case 0:
		case 1: throw new RangeError(`Invalid arity ${arity}`);
		case 2: return function(a, b) {
			if (arguments.length >= 2) return body(a, b);
			return function(self) {
				return body(self, a);
			};
		};
		case 3: return function(a, b, c) {
			if (arguments.length >= 3) return body(a, b, c);
			return function(self) {
				return body(self, a, b);
			};
		};
		default: return function() {
			if (arguments.length >= arity) return body.apply(this, arguments);
			const args = arguments;
			return function(self) {
				return body(self, ...args);
			};
		};
	}
};
/**
* Do nothing and return `false`.
*
* @returns false
*/
function constFalse() {
	return false;
}
/**
* Composes two functions, `ab` and `bc` into a single function that takes in an argument `a` of type `A` and returns a result of type `C`.
* The result is obtained by first applying the `ab` function to `a` and then applying the `bc` function to the result of `ab`.
*
* @param self - The first function to apply (or the composed function in data-last style).
* @param bc - The second function to apply.
* @returns A composed function that applies both functions in sequence.
* @example
* ```ts
* import * as assert from "node:assert"
* import { compose } from "effect/Function"
*
* const increment = (n: number) => n + 1;
* const square = (n: number) => n * n;
*
* assert.strictEqual(compose(increment, square)(2), 9);
* ```
*
* @since 1.0.0
*/
const compose = dual(2, (ab, bc) => (a) => bc(ab(a)));
function getOrInsertComputed(map, key, callback) {
	if (map.has(key)) return map.get(key);
	const value = callback(key);
	map.set(key, value);
	return value;
}

//#endregion
//#region src/regexp.ts
/**
* Regular expressions for matching a HTML tag name
*/
const RE_HTML_TAG = /^[a-z][^-]*$/u;
/**
* Regular expression for matching a TypeScript file extension.
*/
const RE_TS_EXT = /^[cm]?tsx?$/u;
/**
* Regular expression for matching a JavaScript file extension.
*/
const RE_JS_EXT = /^[cm]?jsx?$/u;
/**
* Regular expression for matching a PascalCase string.
*/
const RE_PASCAL_CASE = /^[A-Z][\dA-Za-z]*$/u;
/**
* Regular expression for matching a camelCase string.
*/
const RE_CAMEL_CASE = /^[a-z][\dA-Za-z]*$/u;
/**
* Regular expression for matching a kebab-case string.
*/
const RE_KEBAB_CASE = /^[a-z][\d\-a-z]*$/u;
/**
* Regular expression for matching a snake_case string.
*/
const RE_SNAKE_CASE = /^[a-z][\d_a-z]*$/u;
/**
* Regular expression for matching a CONSTANT_CASE string.
*/
const RE_CONSTANT_CASE = /^[A-Z][\d_A-Z]*$/u;
const RE_JAVASCRIPT_PROTOCOL = /^[\u0000-\u001F ]*j[\t\n\r]*a[\t\n\r]*v[\t\n\r]*a[\t\n\r]*s[\t\n\r]*c[\t\n\r]*r[\t\n\r]*i[\t\n\r]*p[\t\n\r]*t[\t\n\r]*:/iu;
/**
* Regular expression for matching a valid JavaScript identifier.
*/
const RE_JS_IDENTIFIER = /^[_$a-z][\w$]*$/i;
/**
* Regular expression for matching a RegExp string.
*/
const RE_REGEXP_STR = /^\/(.+)\/([A-Za-z]*)$/u;
/**
* Regular expression for matching a `@jsx` annotation comment.
*/
const RE_ANNOTATION_JSX = /@jsx\s+(\S+)/u;
/**
* Regular expression for matching a `@jsxFrag` annotation comment.
*/
const RE_ANNOTATION_JSX_FRAG = /@jsxFrag\s+(\S+)/u;
/**
* Regular expression for matching a `@jsxRuntime` annotation comment.
*/
const RE_ANNOTATION_JSX_RUNTIME = /@jsxRuntime\s+(\S+)/u;
/**
* Regular expression for matching a `@jsxImportSource` annotation comment.
*/
const RE_ANNOTATION_JSX_IMPORT_SOURCE = /@jsxImportSource\s+(\S+)/u;
/**
* Regular expression for matching a React component name.
*/
const RE_COMPONENT_NAME = /^[A-Z]/u;
/**
* Regular expression for matching a React component name (loose).
*/
const RE_COMPONENT_NAME_LOOSE = /^_?[A-Z]/u;
/**
* Regular expression for matching a React Hook name.
*/
const RE_HOOK_NAME = /^use/u;
/**
* Convert a string to the `RegExp`.
* Normal strings (ex: `"foo"`) is converted to `/^foo$/` of `RegExp`.
* Strings like `"/^foo/i"` are converted to `/^foo/i` of `RegExp`.
* @see https://github.com/sveltejs/eslint-plugin-svelte/blob/main/packages/eslint-plugin-svelte/src/utils/regexp.ts
* @param string The string to convert.
* @returns Returns the `RegExp`.
*/
function toRegExp(string) {
	if (string == null) return { test: constFalse };
	const [, pattern, flags = "u"] = RE_REGEXP_STR.exec(string) ?? [];
	if (pattern != null) return new RegExp(pattern, flags);
	return { test: (s) => s === string };
}
/**
* Check whether given string is regexp string
* @param string The string to check
* @returns boolean
*/
function isRegExp(string) {
	return RE_REGEXP_STR.test(string);
}

//#endregion
//#region src/settings.ts
/**
* @internal
*/
const ESLintReactSettingsSchema = z.object({
	/**
	* The source where React is imported from
	* Allows specifying a custom import location for React
	* @default "react"
	* @example "@pika/react"
	*/
	importSource: z.optional(z.string()),
	/**
	* The React Compiler compilationMode that the project is using
	* Used to inform the rule about how components and hooks will be picked up by the compiler
	* @example "infer"
	*/
	compilationMode: z.optional(z.enum([
		"infer",
		"annotation",
		"syntax",
		"all"
	])),
	/**
	* The prop name used for polymorphic components
	* Used to determine the component's type
	* @example "as"
	*/
	polymorphicPropName: z.optional(z.string()),
	/**
	* React version to use
	* "detect" means auto-detect React version from project dependencies
	* @example "18.3.1"
	* @default "detect"
	*/
	version: z.optional(z.string()),
	/**
	* Regex pattern matching custom hooks that should be treated as state hooks
	* @example "useMyState|useCustomState"
	*/
	additionalStateHooks: z.optional(z.string()),
	/**
	* Regex pattern matching custom hooks that should be treated as effect hooks
	* @example "useMyEffect|useCustomEffect"
	*/
	additionalEffectHooks: z.optional(z.string())
});
/**
* @internal
*/
const ESLintSettingsSchema = z.optional(z.object({ "react-x": z.optional(z.unknown()) }));
const DEFAULT_ESLINT_REACT_SETTINGS = {
	version: "detect",
	importSource: "react",
	polymorphicPropName: "as"
};
const DEFAULT_ESLINT_SETTINGS = { "react-x": DEFAULT_ESLINT_REACT_SETTINGS };
function isESLintSettings(settings) {
	return ESLintSettingsSchema.safeParse(settings).success;
}
function isESLintReactSettings(settings) {
	return ESLintReactSettingsSchema.safeParse(settings).success;
}
const decodeESLintSettings = (settings) => {
	if (isESLintSettings(settings)) return settings;
	return DEFAULT_ESLINT_SETTINGS;
};
const decodeSettings = (settings) => {
	if (isESLintReactSettings(settings)) return settings;
	return DEFAULT_ESLINT_REACT_SETTINGS;
};
const normalizeSettings = ({ importSource = "react", compilationMode, polymorphicPropName = "as", version, additionalStateHooks, additionalEffectHooks, ...rest }) => {
	return {
		...rest,
		importSource,
		compilationMode: compilationMode ?? "off",
		polymorphicPropName,
		version: match(version).with(P.union(P.nullish, "", "detect"), () => getReactVersion("19.2.4")).otherwise(identity),
		additionalStateHooks: toRegExp(additionalStateHooks),
		additionalEffectHooks: toRegExp(additionalEffectHooks)
	};
};
const cache = /* @__PURE__ */ new Map();
/**
* Gets the React version from the project's dependencies.
* @param fallback The fallback version to return if React is not found.
* @returns The detected React version or the fallback version.
*/
function getReactVersion(fallback) {
	try {
		return match(module.createRequire(process.cwd() + path.sep)("react")).with({ version: P.select(P.string) }, identity).otherwise(() => fallback);
	} catch {
		return fallback;
	}
}
function getSettingsFromContext(context) {
	const settings = context.settings["react-x"];
	return getOrInsertComputed(cache, settings, () => normalizeSettings(decodeSettings(settings)));
}

//#endregion
export { DEFAULT_ESLINT_REACT_SETTINGS, DEFAULT_ESLINT_SETTINGS, ESLintReactSettingsSchema, ESLintSettingsSchema, RE_ANNOTATION_JSX, RE_ANNOTATION_JSX_FRAG, RE_ANNOTATION_JSX_IMPORT_SOURCE, RE_ANNOTATION_JSX_RUNTIME, RE_CAMEL_CASE, RE_COMPONENT_NAME, RE_COMPONENT_NAME_LOOSE, RE_CONSTANT_CASE, RE_HOOK_NAME, RE_HTML_TAG, RE_JAVASCRIPT_PROTOCOL, RE_JS_EXT, RE_JS_IDENTIFIER, RE_KEBAB_CASE, RE_PASCAL_CASE, RE_REGEXP_STR, RE_SNAKE_CASE, RE_TS_EXT, decodeESLintSettings, decodeSettings, getReactVersion, getSettingsFromContext, isESLintReactSettings, isESLintSettings, isRegExp, normalizeSettings, toRegExp };