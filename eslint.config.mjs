import { type Linter } from "eslint";

const config = [
  { ignores: ["node_modules/**", ".next/**", "coverage/**"] },
] satisfies Linter.Config[];

export default config;
