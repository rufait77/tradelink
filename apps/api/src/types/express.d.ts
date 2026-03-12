import { ParamsDictionary } from 'express-serve-static-core';

// Override Express Request.params to always be Record<string, string>
// Express 5 types define params as string | string[], but in practice
// with our routing, params are always strings.
declare module 'express-serve-static-core' {
  interface Request {
    params: ParamsDictionary;
  }
}
