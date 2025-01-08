ANIL TESTING THE INGESTION MADE THIS CHANGES
Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

Run the following command to verify if Yarn is installed globally:

bash
Copy code
which yarn
If no output is shown, Yarn is not installed, and you'll need to install it.
If a path is shown but the command still fails, it could indicate a PATH issue.
2. Install Yarn
If Yarn is not installed, install it using one of the following methods:

a) Using npm:
If you have Node.js installed, use npm to install Yarn globally:

bash
Copy code
npm install -g yarn
b) Using Homebrew (macOS):
If you're on macOS and have Homebrew, you can install Yarn:

bash
Copy code
brew install yarn
3. Add Yarn to PATH
If Yarn is already installed but not available in your terminal, ensure it's added to your PATH.

a) Locate Yarn's Path:
Run:

bash
Copy code
find / -name yarn 2>/dev/null
Look for the executable path (e.g., /usr/local/bin/yarn or ~/.yarn/bin/yarn).

b) Add to PATH:
Edit your ~/.zshrc file:

bash
Copy code
nano ~/.zshrc
Add the following line:

bash
Copy code
export PATH="$PATH:~/.yarn/bin:~/.config/yarn/global/node_modules/.bin"
Save the file and reload your terminal configuration:

bash
Copy code
source ~/.zshrc

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
