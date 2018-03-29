"use babel";

/* globals atom */
/* eslint-disable import/extensions */
/* eslint-disable import/no-extraneous-dependencies */

import { CompositeDisposable } from "atom"; // eslint-disable-line import/no-unresolved
import { install } from "atom-package-deps";
import { execNode, generateRange } from "atom-linter";
import _ from "lodash";

/**
 * Takes a CFLint issue severity and gets its corresponding Lint severity.
 *
 * @param issueSeverity The CFLint issue severity.
 * @return A string corresponding to the issue.
 */
function getSeverity(issueSeverity) {
  let problemSeverity;
  switch (issueSeverity.toLowerCase()) {
    case "fatal":
    case "critical":
    case "error":
      problemSeverity = "error";
      break;
    case "warning":
    case "caution":
      problemSeverity = "warning";
      break;
    case "info":
    case "cosmetic":
      problemSeverity = "info";
      break;
    default:
      problemSeverity = "info";
  }

  return problemSeverity;
}

export default {
  config: {},

  activate() {
    this.subscriptions = new CompositeDisposable();
    install("linter-cflint");
    atom.config.unset("linter-cflint.cflintPath");
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: "cflint",
      grammarScopes: [
        "text.html.cfml",
        "source.cfscript.embedded",
        "punctuation.definition.tag.cfml",
        "source.cfscript",
      ],
      scope: "file",
      lintsOnChange: false,
      async lint(textEditor) {
        const filePath = textEditor.getPath();
        const fileText = textEditor.getText();

        async function doLint() {
          // get package path
          const packagePath = atom.packages.resolvePackagePath("linter-cflint").trim();

          const javaArgs = [
            "-q",
            "-e",
            "-stdout",
            "-json",
            "-file",
            `"${filePath}"`,
          ];


          const nodePath = `${packagePath}/node_modules/cflint/bin/cflint.js`;

          const jsonResult = await execNode(nodePath, javaArgs, {
            stdin: textEditor.getText(),
            stdio: "pipe",
            stream: "stdout",
            encoding: "utf8",
            throwOnStdErr: false,
            timeout: 30 * 1000,
            ignoreExitCode: true,
          });
          const result = JSON.parse(jsonResult);

          // sometimes there is junk above the start of the XML
          // this is a common thing in CFLint, and while I try to fix it in
          // less sloppy ways, it is time consuming

          if (!result || !{}.hasOwnProperty.call(result, "issues")) {
            throw Error("PARSE_ERROR");
          }


          if (textEditor.getText() !== fileText) {
            // Text has been modified since the lint was triggered, tell linter not to update
            return null;
          }

          // convert the lint results to Atom Linter format
          // and sort by type, then line
          const messages = _(result.issues).map((issue) => {
            const issueLocation = issue.locations[0];
            const line = parseInt(issueLocation.line, 10);
            const { column } = issueLocation;
            const id = issue.id.replace(/_/g, "-").toLowerCase();
            return {
              severity: getSeverity(issue.severity),
              location: {
                file: filePath,
                position: generateRange(textEditor, line - 1, column),
              },
              excerpt: issueLocation.message,
              description: `<span class="badge badge-flexible badge-${getSeverity(issue.severity)}">${id}</span>${issueLocation.variable}\n${issueLocation.expression}`,
            };
          }).sortBy(["severity", "location.position"])
            .value();

          return messages;
        }

        // wrap doLint in a try/catch and handle errors
        try {
          const results = await doLint();
          return results;
        } catch (err) {
          console.error(err);
          let message = "An unexpected error occured with linter-cflint. See the debug log for details.";
          if (err.message === "PARSE_ERROR") {
            message = "[linter-cflint] CFLint encountered an error parsing this ColdFusion file.";
          } else if (err.message === "write EOF") {
            message = "[linter-cflint] There was a problem running CFLint.jar.";
          }
          atom.notifications.addError(message, { dismissable: true });
        }
        return [];
      },
    };
  },
};
