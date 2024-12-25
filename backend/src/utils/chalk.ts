import chalk from "chalk";


export const logInfo = (msg: string)=> console.log(chalk.blue('[INFO]'), msg);
export const logSuccess = (msg: string)=> console.log(chalk.green('[SUCCESS]'), msg);
export const logWarning = (msg: string)=> console.log(chalk.yellow('[WARNING]'), msg);
export const logError = (msg: string)=> console.log(chalk.red('[ERROR]'), msg);