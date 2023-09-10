import { expect } from '@playwright/test';
import { Fixture, Given, When, Then } from '../../../dist/decorators';
import { test } from './fixtures';
import { IntermediateBasePage } from './BasePage';

// custom types not supported yet for decorator steps
// import { defineParameterType } from '@cucumber/cucumber';
// type Color = 'red' | 'blue' | 'yellow';
// defineParameterType({
//   name: 'color',
//   regexp: /red|blue|yellow/,
//   transformer: (s) => s.toLowerCase() as Color,
// });

export
@Fixture<typeof test>('todoPage')
class TodoPage extends IntermediateBasePage {
  get getterField() {
    throw new Error('Should not touch getters while decorating');
  }

  @Given('TodoPage: step')
  async step() {}

  @Then('TodoPage: used fixture is {string}')
  checkUsedFixture(name: string) {
    expect(this.constructor.name).toEqual(name);
  }

  // @Then('TodoPage: passed custom type arg {color} to equal "red"')
  // checkCustomType(color: Color) {
  //   expect(color).toEqual('red');
  // }
}

export
@Fixture<typeof test>('todoPageOnlyFixture')
class TodoPageOnlyFixture extends TodoPage {}

// this class in needed to check that algorithm correctly handles
// intermediate classes
class IntermediateTodoPage extends TodoPageOnlyFixture {}

export
@Fixture<typeof test>('adminTodoPage')
class AdminTodoPage extends IntermediateTodoPage {
  @When('AdminTodoPage: step')
  async step() {}
}
