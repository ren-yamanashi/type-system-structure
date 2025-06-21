import { error, parseBasic } from "tiny-ts-parser";

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
  | { tag: "seq"; body: Term; rest: Term } // 逐次実行に対応 bodyの項を実行し、それが終わったらrestの項を実行する
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
      if (condTy.tag !== "Boolean") error("boolean expected", t.cond);
      const thnTy = typecheck(t.thn, tyEnv);
      const elsTy = typecheck(t.els, tyEnv);
      if (!typeEq(thnTy, elsTy)) error("then and else have different types", t);
      return thnTy;
    }
    case "number":
      return { tag: "Number" };
    case "add": {
      const leftTy = typecheck(t.left, tyEnv);
      if (leftTy.tag !== "Number") error("number expected", t.left);
      const rightTy = typecheck(t.right, tyEnv);
      if (rightTy.tag !== "Number") error("number expected", t.right);
      return { tag: "Number" };
    }
    case "var": {
      if (tyEnv[t.name] === undefined) {
        error(`unknown variable: ${t.name}`, t);
      }
      return tyEnv[t.name];
    }
    case "func": {
      const newTyEnv = { ...tyEnv };
      for (const { name, type } of t.params) {
        newTyEnv[name] = type; // params の情報を newTyEnv に追加
      }
      const retType = typecheck(t.body, newTyEnv);
      return { tag: "Func", params: t.params, retType };
    }
    case "call": {
      const funcTy = typecheck(t.func, tyEnv);
      if (funcTy.tag !== "Func") error("function type expected", t.func);
      if (funcTy.params.length !== t.args.length) {
        error("wrong number of arguments", t);
      }

      funcTy.params.forEach((param, i) => {
        const argTy = typecheck(t.args[i], tyEnv);
        if (!typeEq(argTy, param.type)) {
          error("parameter type mismatch", t.args[i]);
        }
      });

      return funcTy.retType;
    }
    case "seq": {
      typecheck(t.body, tyEnv);
      return typecheck(t.rest, tyEnv);
    }
    case "const": {
      const ty = typecheck(t.init, tyEnv);
      const newTyEnv = { ...tyEnv, [t.name]: ty };
      return typecheck(t.rest, newTyEnv);
    }
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

console.log(
  typecheck(
    parseBasic(`
  const add = (x: number, y:number) => x + y;
  const select = (b: boolean, x:number, y:number) => b ? x : y;
  
  const x = add(1, add(2, 3));
  const y = select(true, x, x);

  y;
`),
    {}
  )
);
