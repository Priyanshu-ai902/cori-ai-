import { LanguageAdapter } from './adapter';
import { NodeAdapter } from './node';
import { PythonAdapter } from './python';
import { JavaAdapter } from './java';
import { GoAdapter } from './go';
import { RustAdapter } from './rust';
import { TerraformAdapter } from './terraform';
import { DockerAdapter } from './docker';

export const languageAdapters: LanguageAdapter[] = [
  new NodeAdapter(),
  new PythonAdapter(),
  new JavaAdapter(),
  new GoAdapter(),
  new RustAdapter(),
  new TerraformAdapter(),
  new DockerAdapter()
].sort((a, b) => b.priority - a.priority);
