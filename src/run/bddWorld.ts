import { APIRequestContext, Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { World as CucumberWorld, IWorldOptions, ITestCaseHookParameter } from '@cucumber/cucumber';
import { ISupportCodeLibrary } from '@cucumber/cucumber/lib/support_code_library_builder/types';
import { PickleStep } from '@cucumber/messages';
import { findStepDefinition } from '../cucumber/loadSteps';
import { getLocationInFile } from '../playwright/getLocationInFile';
import { runStepWithCustomLocation } from '../playwright/testTypeImpl';
import { Fixtures, TestTypeCommon } from '../playwright/types';
import { getStepCode } from '../stepDefinitions/defineStep';

export type BddWorldOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ParametersType = any,
  TestType extends TestTypeCommon = TestTypeCommon,
> = IWorldOptions<ParametersType> & {
  testInfo: TestInfo;
  supportCodeLibrary: ISupportCodeLibrary;
  $tags: string[];
  $test: TestType;
};

// See: https://playwright.dev/docs/test-fixtures#built-in-fixtures
type BuiltinFixtures = {
  page: Page;
  context: BrowserContext;
  browser: Browser;
  browserName: string;
  request: APIRequestContext;
};

type CustomFixtures = Record<string, unknown>;

export class BddWorld<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ParametersType = any,
  TestType extends TestTypeCommon = TestTypeCommon,
> extends CucumberWorld<ParametersType> {
  builtinFixtures!: BuiltinFixtures;
  customFixtures: CustomFixtures = {};

  constructor(public options: BddWorldOptions<ParametersType, TestType>) {
    super(options);
    this.invokeStep = this.invokeStep.bind(this);
  }

  async invokeStep(text: string, argument?: unknown, customFixtures?: CustomFixtures) {
    const stepDefinition = findStepDefinition(
      this.options.supportCodeLibrary,
      text,
      this.testInfo.file,
    );

    if (!stepDefinition) {
      throw new Error(`Undefined step: "${text}"`);
    }

    // attach custom fixtures to world - the only way to pass them to cucumber step fn
    this.customFixtures = customFixtures || {};
    const code = getStepCode(stepDefinition);

    // Get location of step call in generated test file.
    // This call must be exactly here to have correct call stack.
    const location = getLocationInFile(this.test.info().file);

    const { parameters } = await stepDefinition.getInvocationParameters({
      hookParameter: {} as ITestCaseHookParameter,
      step: { text, argument } as PickleStep,
      world: this,
    });

    const res = await runStepWithCustomLocation(this.test, text, location, () =>
      code.apply(this, parameters),
    );

    this.customFixtures = {};

    return res;
  }

  /**
   * Use particular fixture in cucumber-style steps.
   *
   * Note: TS does not support partial generic inference,
   * that's why we can't use this.useFixture<typeof test>('xxx');
   * The solution is to pass TestType as a generic to BddWorld
   * and call useFixture without explicit generic params.
   * Finally, it looks even better as there is no need to pass `typeof test`
   * in every `this.useFixture` call.
   *
   * The downside - it's impossible to pass fixtures type directly to `this.useFixture`
   * like it's done in @Fixture decorator.
   *
   * See: https://stackoverflow.com/questions/45509621/specify-only-first-type-argument
   * See: https://github.com/Microsoft/TypeScript/pull/26349
   */
  useFixture<K extends keyof Fixtures<TestType>>(fixtureName: K) {
    return (this.customFixtures as Fixtures<TestType>)[fixtureName];
  }

  get page() {
    return this.builtinFixtures.page;
  }

  get context() {
    return this.builtinFixtures.context;
  }

  get browser() {
    return this.builtinFixtures.browser;
  }

  get browserName() {
    return this.builtinFixtures.browserName;
  }

  get request() {
    return this.builtinFixtures.request;
  }

  get testInfo() {
    return this.options.testInfo;
  }

  get tags() {
    return this.options.$tags;
  }

  get test() {
    return this.options.$test;
  }

  async init() {
    // async setup before each test
  }

  async destroy() {
    // async teardown after each test
  }
}

export function getWorldConstructor(supportCodeLibrary: ISupportCodeLibrary) {
  // setWorldConstructor was not called
  if (supportCodeLibrary.World === CucumberWorld) {
    return BddWorld;
  }
  if (!Object.prototype.isPrototypeOf.call(BddWorld, supportCodeLibrary.World)) {
    throw new Error(`CustomWorld should inherit from playwright-bdd World`);
  }
  return supportCodeLibrary.World as typeof BddWorld;
}

// type X = {
//   a: string;
//   b: number;
// };

// function f<T extends KeyValue, const K extends keyof T>(k: K) {
//   // type V =
//   return ({} as T)[k];
// }

// const x = f<X>('a');
