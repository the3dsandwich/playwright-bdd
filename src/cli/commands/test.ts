import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import path from 'node:path';
import { Command } from 'commander';
import { TestFilesGenerator } from '../../gen';
import { exitWithMessage } from '../../utils';
import { loadConfig as loadPlaywrightConfig } from '../../playwright/loadConfig';
import { getEnvConfigs } from '../../config/env';
import { BDDConfig, defaults } from '../../config';
import { ConfigOption, configOption } from '../options';

const GEN_WORKER_PATH = path.resolve(__dirname, '..', 'worker.js');

type TestCommandOptions = ConfigOption & {
  tags?: string;
  verbose?: string;
};

export const testCommand = new Command('test')
  .description('Generate Playwright test files from Gherkin documents')
  .addOption(configOption)
  .option('--tags <expression>', `Tags expression to filter scenarios for generation`)
  .option('--verbose', `Verbose mode (default: ${Boolean(defaults.verbose)})`)
  .action(async (opts: TestCommandOptions) => {
    await loadPlaywrightConfig(opts.config);
    const configs = Object.values(getEnvConfigs());
    assertConfigsCount(configs);
    const cliOptions = buildCliOptions(opts);
    await generateFilesForConfigs(configs, cliOptions);
  });

function buildCliOptions(opts: TestCommandOptions) {
  const config: Partial<BDDConfig> = {};
  if ('tags' in opts) config.tags = opts.tags;
  if ('verbose' in opts) config.verbose = Boolean(opts.verbose);
  return config;
}

export function assertConfigsCount(configs: unknown[]) {
  if (configs.length === 0) {
    exitWithMessage(`No BDD configs found. Did you use defineBddConfig() in playwright.config.ts?`);
  }
}

async function generateFilesForConfigs(configs: BDDConfig[], cliConfig: Partial<BDDConfig>) {
  // run first config in main thread and other in workers (to have fresh require cache)
  // See: https://github.com/vitalets/playwright-bdd/issues/32
  const tasks = configs.map((config, index) => {
    const finalConfig = { ...config, ...cliConfig };
    return index === 0 ? new TestFilesGenerator(finalConfig).generate() : runInWorker(finalConfig);
  });

  return Promise.all(tasks);
}

async function runInWorker(config: BDDConfig) {
  const worker = new Worker(GEN_WORKER_PATH, {
    workerData: { config },
  });

  // todo: check if worker exited with error?
  await once(worker, 'exit');
}
