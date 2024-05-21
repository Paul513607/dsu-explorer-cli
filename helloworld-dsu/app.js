// app.js
require("../opendsu-sdk/builds/output/openDSU");
const readline = require('readline');
const opendsu = require("opendsu");
const resolver = opendsu.loadApi("resolver");
const keyssispace = opendsu.loadApi("keyssi");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

$$.LEGACY_BEHAVIOUR_ENABLED = true;

let currentKeySSI = null;
let clearKeySSITimer = null;
const keySSITimeout = 300000; // 5 minutes

const commands = {
    'create-dsu': createDSU,
    'create-file': createFile,
    'create-folder': createFolder,
    'ls': listContents,
    'cat': readFile,
    'clear-keyssi': clearCurrentKeySSI,
    'create-new-dsu': createNewDSU,
    'receive-dsu': receiveDSU,
    'remove-dsu': removeDSU,
    'read-dir': readDir,
    'append-file': appendFile,
    'write-file': writeFile,
    'rm': deleteFileOrFolder,
    'mv': renameFileOrFolder,
    'add-file': addFile,
    'add-files': addMultipleFiles,
    'add-folder': addFolder,
    'extract-file': extractFile,
    'extract-folder': extractFolder,
    'help': showHelp,
    'exit': () => rl.close()
};

function saveCurrentKeySSI(keySSI) {
    currentKeySSI = keySSI;
    if (clearKeySSITimer) {
        clearTimeout(clearKeySSITimer);
    }
    clearKeySSITimer = setTimeout(clearCurrentKeySSI, keySSITimeout);
}

function clearCurrentKeySSI() {
    currentKeySSI = null;
    console.log('Current KeySSI cleared.');
    prompt();
}

function promptForKeySSI(callback) {
    if (currentKeySSI) {
        callback(currentKeySSI);
    } else {
        rl.question('Enter DSU KeySSI: ', (keySSI) => {
            saveCurrentKeySSI(keySSI);
            callback(keySSI);
        });
    }
}

function createDSU() {
    const templateSSI = keyssispace.createTemplateSeedSSI('default');
    rl.question('Enter file name: ', (fileName) => {
        rl.question('Enter file content: ', (content) => {
            resolver.createDSU(templateSSI, (err, dsuInstance) => {
                if (err) {
                    console.error('Error creating DSU:', err);
                    return prompt();
                }

                dsuInstance.writeFile(fileName, content, (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                        return prompt();
                    }
                    console.log("Data written successfully!");

                    dsuInstance.getKeySSIAsString((err, keyidentifier) => {
                        if (err) {
                            console.error('Error getting KeySSI:', err);
                            return prompt();
                        }
                        console.log("KeySSI identifier:", keyidentifier);
                        saveCurrentKeySSI(keyidentifier);
                        prompt();
                    });
                });
            });
        });
    });
}

function createFile() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file path: ', (filePath) => {
            rl.question('Enter file content: ', (content) => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.writeFile(filePath, content, (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                            return prompt();
                        }
                        console.log('File created successfully.');
                        prompt();
                    });
                });
            });
        });
    });
}

function createFolder() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter folder path: ', (folderPath) => {
            resolver.loadDSU(keySSI, (err, dsuInstance) => {
                if (err) {
                    console.error('Error loading DSU:', err);
                    return prompt();
                }

                dsuInstance.createFolder(folderPath, (err) => {
                    if (err) {
                        console.error('Error creating folder:', err);
                        return prompt();
                    }
                    console.log('Folder created successfully.');
                    prompt();
                });
            });
        });
    });
}

// TODO: correctly check for directory/DSU and show accordingly
function listContents() {
    promptForKeySSI((keySSI) => {
        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if (err) {
                console.error('Error loading DSU:', err);
                return prompt();
            }

            dsuInstance.listFiles('/', (err, files) => {
                if (err) {
                    console.error('Error listing files:', err);
                    return prompt();
                }
                
                dsuInstance.listFolders('/', {ignoreMounts: true}, (err, folders) => {
                    if (err) {
                        console.error('Error listing folders:', err);
                        return prompt();
                    }

                    dsuInstance.listFolders('/', {ignoreMounts: false}, (err, foldersAndMounts) => {
                        if (err) {
                            console.error('Error listing folders and mounts:', err);
                            return prompt();
                        }

                        console.log('Contents of DSU:');
                        files.forEach(file => console.log(file + ' ... file'));
                        folders.forEach(folder => console.log(folder + '... directory'));
                        const mounts = foldersAndMounts.filter((folderOrMount) => !folders.includes(folderOrMount));
                        mounts.forEach(mount => console.log(mount + ' ... DSU'));
                        prompt();
                    });
                });
            });
        });
    });
}

function readFile() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file path: ', (filePath) => {
            resolver.loadDSU(keySSI, (err, dsuInstance) => {
                if (err) {
                    console.error('Error loading DSU:', err);
                    return prompt();
                }

                dsuInstance.readFile(filePath, (err, data) => {
                    if (err) {
                        console.error('Error reading file:', err);
                        return prompt();
                    }
                    console.log('File content:');
                    console.log(data.toString());
                    prompt();
                });
            });
        });
    });
}

function createNewDSU() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter mounting point (DSU name): ', (mountingPoint) => {
            const templateSSI = keyssispace.createTemplateSeedSSI('default');

            resolver.createDSU(templateSSI, (err, newDSUInstance) => {
                if (err) {
                    console.error('Error creating new DSU:', err);
                    return prompt();
                }

                resolver.loadDSU(keySSI, (err, currentDSUInstance) => {
                    if (err) {
                        console.error('Error loading current DSU:', err);
                        return prompt();
                    }
    
                    currentDSUInstance.createFolder(mountingPoint, (err) => {
                        if (err) {
                            console.error('Error creating folder:', err);
                            return prompt();
                        }
    
                        currentDSUInstance.mount(mountingPoint, templateSSI, {}, (err) => {
                            if (err) {
                                console.error('Error mounting DSU:', err);
                                return prompt();
                            }
                            console.log('DSU mounted successfully.');
                            prompt();
                        });
                        prompt();
                    });
                });
            });
        });
    });
}


function receiveDSU() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter mounting point (DSU name): ', (mountingPoint) => {
            rl.question('Enter other DSU KeySSI: ', (otherKeySSI) => {
                resolver.loadDSU(keySSI, (err, currentDSUInstance) => {
                    if (err) {
                        console.error('Error loading current DSU:', err);
                        return prompt();
                    }
    
                    currentDSUInstance.createFolder(mountingPoint, (err) => {
                        if (err) {
                            console.error('Error creating folder:', err);
                            return prompt();
                        }
    
                        currentDSUInstance.mount(mountingPoint, otherKeySSI, {}, (err) => {
                            if (err) {
                                console.error('Error mounting DSU:', err);
                                return prompt();
                            }
                            console.log('DSU mounted successfully.');
                            prompt();
                        });
                        prompt();
                    });
                });
            });
        });
    });
}

// TODO: fix ???
function removeDSU() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter mounting point (DSU name): ', (mountingPoint) => {
            resolver.loadDSU(keySSI, (err, currentDSUInstance) => {
                if (err) {
                    console.error('Error loading current DSU:', err);
                    return prompt();
                }

                currentDSUInstance.unmount(mountingPoint, {}, (err) => {
                    if (err) {
                        console.error('Error unmounting DSU:', err);
                        return prompt();
                    }
                    console.log('DSU unmounted successfully.');
                    prompt();
                });
                prompt();
            });
        });
    });
}

function readDir() {
    promptForKeySSI((keySSI) => {
        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if (err) {
                console.error('Error loading DSU:', err);
                return prompt();
            }

            rl.question('Enter directory path: ', (dirPath) => {
                dsuInstance.readDir(dirPath, {withFileTypes: true}, (err, entries) => {
                    if (err) {
                        console.error('Error listing contents:', err);
                        return prompt();
                    }
                    
                    console.log(`Contents of ${dirPath}:`);
                    entries.files.forEach(file => console.log(file + ' ... file'));
                    entries.folders.forEach(folder => console.log(folder + '... directory'));
                    prompt();
                });
            });
        });
    });
}

function appendFile() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file path: ', (filePath) => {
            rl.question('Enter file content to append: ', (content) => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.appendToFile(filePath, content, (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                            return prompt();
                        }
                        console.log('File content appended successfully.');
                        prompt();
                    });
                });
            });
        });
    });
}

function writeFile() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file path: ', (filePath) => {
            rl.question('Enter file content: ', (content) => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.writeFile(filePath, content, (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                            return prompt();
                        }
                        console.log('File created successfully.');
                        prompt();
                    });
                });
            });
        });
    });
}

function deleteFileOrFolder() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file/folder path: ', (path) => {
            resolver.loadDSU(keySSI, (err, dsuInstance) => {
                if (err) {
                    console.error('Error loading DSU:', err);
                    return prompt();
                }

                dsuInstance.delete(path, (err) => {
                    if (err) {
                        console.error('Error deleting:', err);
                        return prompt();
                    }
                    console.log('Delete successful.');
                    prompt();
                });
            });
        });
    });
}

function renameFileOrFolder() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file/folder path: ', (path) => {
            rl.question('Enter new file/folder path: ', (newPath => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.rename(path, newPath, (err) => {
                        if (err) {
                            console.error('Error renaming:', err);
                            return prompt();
                        }
                        console.log('Rename successful.');
                        prompt();
                    });
                });
            }));
        });
    });
}

function addFile() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter file path (file system): ', (fsPath) => {
            rl.question('Enter path (DSU): ', (dsuPath => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.addFile(fsPath, dsuPath, {}, (err) => {
                        if (err) {
                            console.error('Error adding file:', err);
                            return prompt();
                        }

                        console.log('File added successfully.')
                        prompt();
                    });
                });
            }));
        });
    });
}

function promptAddFile(fsPathsArray, callback) {
    rl.question('Enter file path (file system) - leave it empty to stop: ', (fsPath) => {
        if (fsPath === '') {
            return callback(fsPathsArray);
        }
        fsPathsArray.push(fsPath);
        promptAddFile(fsPathsArray, callback);
    });
}

function addMultipleFiles() {
    promptForKeySSI((keySSI) => {
        const fsPathsArray = [];
        promptAddFile(fsPathsArray, (fsPathsArray) => {
            if (fsPathsArray.length === 0) {
                console.log('No files to add.');
                return prompt();
            }

            rl.question('Enter path (DSU): ', (dsuPath => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.addFiles(fsPathsArray, dsuPath, {}, (err) => {
                        if (err) {
                            console.error('Error adding files:', err);
                            return prompt();
                        }

                        console.log('Files added successfully.')
                        prompt();
                    });
                });
            }));
        });
    });
}

function addFolder() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter folder path (file system): ', (fsPath) => {
            rl.question('Enter path (DSU): ', (dsuPath => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.addFolder(fsPath, dsuPath, {}, (err) => {
                        if (err) {
                            console.error('Error adding folder:', err);
                            return prompt();
                        }

                        console.log('Folder added successfully.')
                        prompt();
                    });
                });
            }));
        });
    });
}

function extractFile() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter path (file system): ', (fsPath) => {
            rl.question('Enter file path (DSU): ', (dsuPath => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.extractFile(fsPath, dsuPath, {}, (err) => {
                        if (err) {
                            console.error('Error extracting file:', err);
                            return prompt();
                        }

                        console.log('File extracted successfully.')
                        prompt();
                    });
                });
            }));
        });
    });
}

// TODO: fix
function extractFolder() {
    promptForKeySSI((keySSI) => {
        rl.question('Enter path (file system): ', (fsPath) => {
            rl.question('Enter folder path (DSU): ', (dsuPath => {
                resolver.loadDSU(keySSI, (err, dsuInstance) => {
                    if (err) {
                        console.error('Error loading DSU:', err);
                        return prompt();
                    }

                    dsuInstance.extractFolder(fsPath, dsuPath, {}, (err) => {
                        if (err) {
                            console.error('Error extracting folder:', err);
                            return prompt();
                        }

                        console.log('Folder extracted successfully.')
                        prompt();
                    });
                });
            }));
        });
    });
}

function showHelp() {
    console.log('Available commands:');
    console.log('  create-dsu      - Create a new DSU with a file');
    console.log('  create-file     - Create a new file in a DSU');
    console.log('  create-folder   - Create a new folder in a DSU');
    
    console.log('  create-new-dsu  - Create a new DSU inside the current one');
    console.log('  receive-dsu     - Receive a DSU inside the current one');
    console.log('  remove-dsu      - Removes (unmounts) a DSU inside the current one');
    console.log('  ls              - List all contents of a DSU');

    console.log('  cat             - Display the content of a file in a DSU');
    console.log('  read-dir        - Display the contents of a directory in a DSU');
    console.log('  append-file     - Appends the content to a file in a DSU');
    console.log('  write-file      - Writes the content to a file in a DSU');
    console.log('  rm              - Deletes a file or folder in a DSU');
    console.log('  mv              - Renames a file or folder in a DSU');

    console.log('  add-file        - Copies a file from the file system to the DSU');
    console.log('  add-files       - Copies multiple files from the file system to the DSU');
    console.log('  add-folder      - Copies a folder from the file system to the DSU');
    console.log('  extract-file    - Restores a file from the DSU to the file system');
    console.log('  extract-folder  - Restores a folder from the DSU to the file system');

    console.log('  clear-keyssi    - Clear the current DSU KeySSI');
    console.log('  help            - Show this help message');
    console.log('  exit            - Exit the application');
    prompt();
}

function prompt() {
    rl.question('> ', (input) => {
        const command = input.trim();
        if (commands[command]) {
            commands[command]();
        } else {
            console.log('Unknown command. Type "help" for a list of available commands.');
            prompt();
        }
    });
}

console.log('Welcome to the DSU Explorer CLI app!');
showHelp();
prompt();
