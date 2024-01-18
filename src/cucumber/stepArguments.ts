/**
 * Based on: https://github.com/cucumber/cucumber-js/blob/main/src/step_arguments.ts
 */
import util from 'node:util';
import * as messages from '@cucumber/messages';
import { doesHaveValue } from './valueChecker';

export interface IPickleStepArgumentFunctionMap<T> {
  dataTable: (arg: messages.PickleTable) => T;
  docString: (arg: messages.PickleDocString) => T;
}

export function parseStepArgument<T>(
  arg: messages.PickleStepArgument,
  mapping: IPickleStepArgumentFunctionMap<T>,
): T {
  if (doesHaveValue(arg.dataTable)) {
    return mapping.dataTable(arg.dataTable);
  } else if (doesHaveValue(arg.docString)) {
    return mapping.docString(arg.docString);
  }
  throw new Error(`Unknown step argument: ${util.inspect(arg)}`);
}
