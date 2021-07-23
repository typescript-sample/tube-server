import { Request, Response } from 'express';

export function log(msg: any): void {
  console.log(JSON.stringify(msg));
}
export function respondModel<T>(obj: T, res: Response): void {
  if (obj) {
    res.status(200).json(obj).end();
  } else {
    res.status(404).json(null).end();
  }
}
export function handleError(err: any, res: Response, lg?: (msg: string, ctx?: any) => void) {
  if (lg) {
    lg(err as any);
    res.status(500).end('Internal Server Error');
  } else {
    res.status(500).end(err);
  }
}
export function queryRequiredParams(req: Request, res: Response, name: string, split?: string): string[] {
  const v = req.query[name];
  if (!v) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  const v2 = v.toString();
  if (v2.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  if (!split) {
    split = ',';
  }
  return v2.split(split);
}
export function queryParams(req: Request, name: string, d?: string[], split?: string): string[] {
  const q = req.query[name];
  const v = q && q.toString();
  if (!v || v.length === 0) {
    return d;
  }
  if (!split) {
    split = ',';
  }
  return v.split(split);
}
export function queryParam(req: Request, res: Response, name: string): string {
  const v = req.query[name].toString();
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  return v;
}
export function query(req: Request, name: string, d?: string): string {
  const p = req.query[name];
  if (!p || p.toString().length === 0) {
    return d;
  }
  return p.toString();
}
export function queryRequiredNumber(req: Request, res: Response, name: string): number {
  const field = req.query[name];
  const v = field.toString();
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  if (isNaN(v as any)) {
    res.status(400).end(`'${name}' is not a valid number`);
    return undefined;
  }
  const n = parseFloat(v);
  return n;
}
export function queryNumber(req: Request, name: string, d?: number): number {
  const field = req.query[name];
  const v = field ? field.toString() : undefined;
  if (!v || v.length === 0) {
    return d;
  }
  if (isNaN(v as any)) {
    return d;
  }
  const n = parseFloat(v);
  return n;
}
export function queryRequiredDate(req: Request, res: Response, name: string): Date {
  const field = req.query[name];
  const v = field.toString();
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  const date = new Date(v);
  if (date.toString() === 'Invalid Date') {
    res.status(400).end(`'${name}' is not a valid date`);
    return undefined;
  }
  return date;
}
export function queryDate(req: Request, name: string, d?: Date): Date {
  const field = req.query[name];
  if (field) {
    const v = field.toString();
    if (!v || v.length === 0) {
      return d;
    }
    const date = new Date(v);
    if (date.toString() === 'Invalid Date') {
      return d;
    }
    return date;
  }
  return undefined;
}

export function param(req: Request, res: Response, name: string): string {
  const v = req.params[name];
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  return v;
}
export function params(req: Request, name: string, d?: string[], split?: string): string[] {
  const v = req.params[name];
  if (!v || v.length === 0) {
    return d;
  }
  if (!split) {
    split = ',';
  }
  return v.split(split);
}
export function getRequiredParameters(req: Request, res: Response, name: string, split?: string): string[] {
  const v = req.params[name];
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  if (!split) {
    split = ',';
  }
  return v.split(split);
}
export function getRequiredNumber(req: Request, res: Response, name: string): number {
  const v = req.params[name];
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  if (isNaN(v as any)) {
    res.status(400).end(`'${name}' must be a number`);
    return undefined;
  }
  const n = parseFloat(v);
  return n;
}
export function getNumber(req: Request, name: string, d?: number): number {
  const v = req.params[name];
  if (!v || v.length === 0) {
    return d;
  }
  if (isNaN(v as any)) {
    return d;
  }
  const n = parseFloat(v);
  return n;
}
export function getInteger(req: Request, name: string, d?: number): number {
  const v = req.params[name];
  if (!v || v.length === 0) {
    return d;
  }
  if (isNaN(v as any)) {
    return d;
  }
  const n = parseFloat(v);
  const s = n.toFixed(0);
  return parseFloat(s);
}
export function getRequiredDate(req: Request, res: Response, name: string): Date {
  const v = req.params[name];
  if (!v || v.length === 0) {
    res.status(400).end(`'${name}' cannot be empty`);
    return undefined;
  }
  const date = new Date(v);
  if (date.toString() === 'Invalid Date') {
    res.status(400).end(`'${name}' must be a date`);
    return undefined;
  }
  return date;
}
export function getDate(req: Request, name: string, d?: Date): Date {
  const v = req.params[name];
  if (!v || v.length === 0) {
    return d;
  }
  const date = new Date(v);
  if (date.toString() === 'Invalid Date') {
    return d;
  }
  return date;
}
