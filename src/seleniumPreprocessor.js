import fs from 'fs';
import path from 'path';

export function processTests() {

    const sourceDirectory = './tests/selenium';
    const targetDirectory = './tests/e2e'
    const beforeEachRegex = /beforeEach\(async function\(\) \{\n\s+driver = await new Builder\(\).forBrowser\('chrome'\).build\(\)\n\s+vars = \{\}\n\s+\}\)/;
    const afterEachRegex = /afterEach\(async function\(\) \{[\s\S]*?await driver.quit\(\);\s+\}\)/;
    const requireStatement = "const { Options } = require('selenium-webdriver/chrome');\n";

    const snippet = `
  beforeEach(async function() {
    const chromeOptions = new Options();
    chromeOptions.headless().addArguments('--disable-gpu', '--no-sandbox');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
    driver.manage().setTimeouts( { implicit: 5000 } );
    vars = {};
  });
`;

    const afterEachSnippet = `
    afterEach(async function() {
    if (this.currentTest.state === 'failed') {
        let imageName = \`screenshot-\${this.currentTest.title.replace(/\\s+/g, '_')}.png\`;
        let screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync(imageName, screenshot, 'base64');
    }
    await driver.quit();
    });
    `;


    fs.readdir(sourceDirectory, (err, files) => {
        if (err) {
            console.error("Error reading the directory:", err);
            return;
        }

        files.forEach(file => {
            if (path.extname(file) === '.js') {
                const sourcePath = path.join(sourceDirectory, file);
                const baseName = path.basename(file, '.js');
                const targetPath = path.join(targetDirectory, `${baseName}.cjs`);

                fs.readFile(sourcePath, 'utf8', (err, data) => {
                    if (err) {
                        console.error(`Error reading file ${file}:`, err);
                        return;
                    }

                    let modifiedData = data;
                    if (!modifiedData.includes(requireStatement.trim())) {
                        modifiedData = requireStatement + modifiedData;
                    }

                    if (modifiedData.includes('beforeEach')) {
                        modifiedData = modifiedData.replace(beforeEachRegex, snippet.trim());
                    }
                    
                    if (modifiedData.match(afterEachRegex)) {
                        modifiedData = modifiedData.replace(afterEachRegex, afterEachSnippet.trim());
                    }
                    
                    fs.writeFile(targetPath, modifiedData, 'utf8', (err) => {
                        if (err) {
                            console.error(`Error writing file ${file}:`, err);
                        } else {
                            console.log(`${baseName}.cjs has been processed.`);
                        }
                    });
                });
            }
        });
    });
}