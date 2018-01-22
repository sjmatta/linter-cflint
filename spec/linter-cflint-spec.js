'use babel';

import * as path from 'path';

// eslint-disable-next-line no-unused-vars
import { it, fit, wait, beforeEach, afterEach } from 'jasmine-fix';

const { lint } = require('../lib/main.js').provideLinter();

const cfCatchPath = path.join(__dirname, 'fixtures', 'cfcatch_tag.cfc');

describe('The bootlint provider for Linter', () => {
  beforeEach(async () => {
    atom.workspace.destroyActivePaneItem();
    await atom.packages.activatePackage('language-cfml');
    await atom.packages.activatePackage('linter-cflint');
  });

  it('checks a file with issues', async () => {
    const editor = await atom.workspace.open(cfCatchPath);
    const messages = await lint(editor);

    expect(messages.length).toBe(7);
    expect(messages[0].severity).toBe('info');
    expect(messages[0].excerpt).toBe("Method name myFunction has prefix or postfix and could be named better.");
    expect(messages[0].location.file).toBe(cfCatchPath);
    expect(messages[0].location.position).toEqual([[1, 4], [1, 15]]);

    expect(messages[1].severity).toBe("info");
    expect(messages[1].excerpt).toBe("<cffunction name=\"myFunction\"> should have @output='false'");
    expect(messages[1].location.file).toBe(cfCatchPath);
    expect(messages[1].location.position).toEqual([[1, 5], [1, 15]]);

    expect(messages[2].severity).toBe("info");
    expect(messages[2].excerpt).toBe("Scope CFCATCH should not be upper case.");
    expect(messages[2].location.file).toBe(cfCatchPath);
    expect(messages[2].location.position).toEqual([[5, 25], [5, 32]]);

    expect(messages[3].severity).toBe("info");
    expect(messages[3].excerpt).toBe("Variable Message is not a valid name. Please use camelCase or underscores.");
    expect(messages[3].location.file).toBe(cfCatchPath);
    expect(messages[3].location.position).toEqual([[5, 33], [5, 42]]);

    expect(messages[4].severity).toBe("warning");
    expect(messages[4].excerpt).toBe("Component fixturesatch_tag is missing a hint.");
    expect(messages[4].location.file).toBe(cfCatchPath);
    expect(messages[4].location.position).toEqual([[0, 1], [0, 12]]);

    expect(messages[5].severity).toBe("warning");
    expect(messages[5].excerpt).toBe("Function myFunction is missing a return type.");
    expect(messages[5].location.file).toBe(cfCatchPath);
    expect(messages[5].location.position).toEqual([[1, 5], [1, 15]]);

    expect(messages[6].severity).toBe("warning");
    expect(messages[6].excerpt).toBe("Component fixturesatch_tag is missing a hint.");
    expect(messages[6].location.file).toBe(cfCatchPath);
    expect(messages[6].location.position).toEqual([[10, 1], [10, 12]]);
  });

});
