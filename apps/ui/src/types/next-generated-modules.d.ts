// Allow Next.js generated runtime imports that point to .js files
// The validator file imports paths like "../../app/page.js" and "../../app/layout.js".
// TypeScript may not find those exact .js files in a TSX project, so provide permissive
// module declarations to avoid the "Cannot find module ..." errors.

declare module '*app/page.js' {
  const value: any;
  export default value;
}

declare module '*app/layout.js' {
  const value: any;
  export default value;
}

declare module '*app/error.js' {
  const value: any;
  export default value;
}

// Fallback for other generated files used by Next's type validator
declare module '*app/*.js' {
  const value: any;
  export default value;
}
