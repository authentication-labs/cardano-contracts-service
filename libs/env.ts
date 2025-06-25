
export function checkEnvVars<T extends string>(
  variableNames: readonly T[],
): Record<T, string> {
  const result: Record<T, string> = {} as Record<T, string>;
  const missingVars: string[] = [];
  for (const envVar of variableNames) {
    const value = Deno.env.get(envVar);
    // console.log(`"${envVar}" = "${value}" (undefined? ${value === undefined})`);
    if (!value) {
      missingVars.push(envVar);
    } else {
      result[envVar] = value;
    }
  }
  // console.log("missingVars: ", missingVars);
  if (missingVars.length > 0) {
    throw new Error(
      `The following environment variables are required: ${
        missingVars.join(", ")
      }`,
    );
  }
  return result;
}
