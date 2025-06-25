export async function fileExists(path: string): Promise<boolean> {
  // https://docs.deno.com/examples/checking_file_existence/
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(path: string): Promise<void> {
  // https://docs.deno.com/examples/checking_file_existence/
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

export async function writeJsonFile(path: string, data: any): Promise<void> {
  const dir = path.split('/').slice(0, -1).join('/');
  if (dir) {
    await ensureDir(dir);
  }
  
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2) + '\n');
}
