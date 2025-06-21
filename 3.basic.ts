import { parseBasic } from "tiny-ts-parser";

type Type =
  | { tag: "Boolean" }
  | { tag: "Number" }
  | { tag: "Func"; params: Param[]; retType: Type };

type Param = { name: string; type: Type };

type Term =
  | { tag: "true" }
  | { tag: "false" }
  | { tag: "if"; cond: Term; thn: Term; els: Term }
  | { tag: "number"; n: number }
  | { tag: "add"; left: Term; right: Term }
  | { tag: "var"; name: string }
  | { tag: "func"; params: Param[]; body: Term }
  | { tag: "call"; func: Term; args: Term[] }
  | { tag: "seq"; body: Term; rest: Term } // 逐次実行に対応
  | { tag: "const"; name: string; init: Term; rest: Term };

type TypeEnv = Record<string, Type>;

function typeEq(ty1: Type, ty2: Type): boolean {
  switch (ty2.tag) {
    case "Boolean": {
      return ty1.tag === "Boolean";
    }
    case "Number": {
      return ty1.tag === "Number";
    }
    case "Func": {
      if (ty1.tag !== "Func") return false;
      if (ty1.params.length !== ty2.params.length) return false;
      if (
        ty1.params.some((param, i) => !typeEq(param.type, ty2.params[i].type))
      ) {
        return false;
      }
      if (!typeEq(ty1.retType, ty2.retType)) return false;
      return true;
    }
  }
}

function typecheck(t: Term, tyEnv: TypeEnv): Type {
  switch (t.tag) {
    case "true":
      return { tag: "Boolean" };
    case "false":
      return { tag: "Boolean" };
    case "if": {
      const condTy = typecheck(t.cond, tyEnv);
      if (condTy.tag !== "Boolean") throw "boolean expected";
      const thnTy = typecheck(t.thn, tyEnv);
      const elsTy = typecheck(t.els, tyEnv);
      if (thnTy.tag !== elsTy.tag) throw "then and else have different types";
      return thnTy;
    }
    case "number":
      return { tag: "Number" };
    case "add": {
      const leftTy = typecheck(t.left, tyEnv);
      if (leftTy.tag !== "Number") throw "number expected";
      const rightTy = typecheck(t.right, tyEnv);
      if (rightTy.tag !== "Number") throw "number expected";
      return { tag: "Number" };
    }
    case "var": {
      if (tyEnv[t.name] === undefined) {
        throw new Error(`unknown variable: ${t.name}`);
      }
      return tyEnv[t.name];
    }
    case "func": {
      const newTyEnv = { ...tyEnv };
      // const newTyEnv = tyEnv;
      for (const { name, type } of t.params) {
        newTyEnv[name] = type; // params の情報を newTyEnv に追加
      }
      const retType = typecheck(t.body, newTyEnv);
      return { tag: "Func", params: t.params, retType };
    }
    case "call": {
      const funcTy = typecheck(t.func, tyEnv);
      if (funcTy.tag !== "Func") throw new Error("function type expected");
      if (funcTy.params.length !== t.args.length) {
        throw new Error("wrong number of arguments");
      }
      if (
        funcTy.params.some((param, i) => {
          const argTy = typecheck(t.args[i], tyEnv);
          return !typeEq(argTy, param.type);
        })
      ) {
        throw new Error("parameter type mismatch");
      }
      return funcTy.retType;
    }
    default:
      throw new Error("not implemented yet");
  }
}

console.dir(typecheck(parseBasic("(x: boolean) => x"), {}), { depth: null }); // ✅ OK
console.dir(typecheck(parseBasic("((x: number) => x)(42)"), {}), {
  depth: null,
}); // ✅ OK
// console.dir(typecheck(parseBasic("((x: boolean) => x)(x)"), {}), {
//   depth: null,
// }); // ❌ NG
// console.dir(typecheck(parseBasic("((x: boolean) => x)(42)"), {}), {
//   depth: null,
// }); // ❌ NG
// console.dir(typecheck(parseBasic("((x: number) => x)(true)"), {}), {
//   depth: null,
// }); // ❌ NG
