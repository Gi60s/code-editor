(function() {
    'use strict';

    this.CodeEditor = CodeEditor;


    function CodeEditor(element) {
        if (!(this instanceof CodeEditor)) return new CodeEditor(element);
        const editor = this;
        this.element = element;

        // initialize the element
        while (element.children.length) element.removeChild(element.firstChild);
        toggleClass(element, 'code-editor container', true);

        // add the menu
        const menu = makeElement('div', 'code-editor menu');
        element.appendChild(menu);

        // new file button
        const newFile = makeElement('a', 'new-file', 'New File');
        newFile.title = 'New File';
        newFile.href = '#';
        menu.appendChild(newFile);
        newFile.addEventListener('click', function(e) {
            e.preventDefault();
            if (selected instanceof Directory) {
                const file = new File(editor, selected.untitled());
                selected.add(file);
            }
        });

        // new directory button
        const newDirectory = makeElement('a', 'new-directory', 'New Directory');
        newFile.title = 'New Directory';
        newDirectory.href = '#';
        menu.appendChild(newDirectory);
        newDirectory.addEventListener('click', function(e) {
            e.preventDefault();
            if (selected instanceof Directory) {
                const file = new Directory(editor, selected.untitled());
                selected.add(file);
            }
        });

        // delete button
        const deleteItem = makeElement('a', 'delete', 'Delete Item');
        newFile.title = 'Delete Item';
        deleteItem.href = '#';
        menu.appendChild(deleteItem);
        deleteItem.addEventListener('click', function(e) {
            e.preventDefault();
            // TODO
        });

        // TODO: add rename and metadata buttons

        // add file structure element
        const fileStructure = makeElement('div', 'code-editor file-structure container');
        element.appendChild(fileStructure);

        // add root directory to file structure element
        const directory = new Directory(this, 'root', {});
        fileStructure.appendChild(directory.element);

        var selected = directory;
        this.root = directory;

        this.on('select', function() {
            const isFile = this instanceof File;

            disabled(newFile, isFile);
            disabled(newDirectory, isFile);

            // root directory cannot be deleted
            deleteItem.disabled = this === directory;

            toggleClass(selected.element, 'selected', false);
            toggleClass(this.element, 'selected', true);
            selected = this;
        });

        this.onAny(function(event, payload) {
            console.log(event, this, payload);
        });
    }

    CodeEditor.prototype.directory = function(name, metadata) {
        return new Directory(this, name, metadata);
    };

    CodeEditor.prototype.emit = function(event, context, payload) {
        if (this._handlers && this._handlers[event]) {
            this._handlers[event].forEach(function(callback) {
                callback.call(context, payload);
            });
        }
        if (this._anyHandlers) {
            this._anyHandlers.forEach(function(callback) {
                callback.call(context, event, payload);
            });
        }
    };

    CodeEditor.prototype.file = function(name, content, metadata) {
        return new File(this, name, content, metadata);
    };

    CodeEditor.prototype.onAny = function(callback) {
        if (typeof callback === 'function') {
            if (!this._anyHandlers) this._anyHandlers = [];
            this._anyHandlers.push(callback);
        }
    };

    CodeEditor.prototype.off = function(event, callback) {
        if (typeof event === 'string' && typeof callback === 'function') {
            if (this._handlers && this._handlers[event]) {
                const index = this._handlers[event].indexOf(callback);
                if (index !== -1) this._handlers[event].splice(index, 1);
            }
        } else {
            throw Error('Invalid parameters. Expected a string and a function.');
        }
    };

    CodeEditor.prototype.on = function(event, callback) {
        if (typeof event === 'string' && typeof callback === 'function') {
            if (!this._handlers) this._handlers = {};
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(callback);
        } else {
            throw Error('Invalid parameters. Expected a string and a function.');
        }
    };

    CodeEditor.prototype.prompt = function(prompt, value, callback) {
        const editor = this;

        const form = makeElement('form');
        form.setAttribute('autocomplete', 'off');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            callback(true, input.value);
            editor.element.removeChild(container);
        });

        const label = makeElement('label', '', prompt);
        label.setAttribute('for', 'code-editor-prompt-input');
        form.appendChild(label);

        const input = makeElement('input');
        input.id = 'code-editor-prompt-input';
        input.value = value;
        form.appendChild(input);

        const buttons = makeElement('div');
        form.appendChild(buttons);

        const submit = makeElement('button', '', 'OK');
        submit.type = 'submit';
        buttons.appendChild(submit);

        const cancel = makeElement('button', '', 'Cancel');
        cancel.type = 'button';
        buttons.appendChild(cancel);
        cancel.addEventListener('click', function() {
            callback(false);
            editor.element.removeChild(container);
        });

        const container = makeElement('div', 'code-editor prompt');
        container.appendChild(form);

        this.element.appendChild(container);
        input.focus();
        input.select();
    };



    function File(editor, name, content, metadata) {
        if (!(this instanceof File)) return new File(editor, name, content, metadata);
        if (!name) name = '';
        if (!content) content = '';
        if (!metadata) metadata = {};

        const file = this;
        this.editor = editor;

        // create clickable label
        const a = makeElement('span', 'code-editor file-structure leaf link ' + this.ext);
        a.addEventListener('click', function(e) {
            e.preventDefault();
            file.select();
        });

        // spacer block
        const pad = makeElement('span', 'code-editor file-structure padding');
        a.appendChild(pad);

        // label
        const label = makeElement('span', 'code-editor file-structure label', name);
        a.appendChild(label);

        // context
        makeContextMenu(a, [
            {
                label: 'Rename',
                handler: function() {
                    editor.prompt('New file name:', name, function(submitted, value) {
                        if (submitted) { // noinspection JSAnnotator
                            file.name = value;
                        }
                    });
                }
            },
            {
                label: 'Delete',
                handler: function() {
                    const parent = file.element.parent.codeEditor;
                    parent.remove(file);
                }
            }
        ]);


        Object.defineProperties(this, {

            content: {
                get: function() { return content },
                set: function(value) {
                    const prev = content;
                    content = value;
                    editor.emit('content', file, {
                        current: value,
                        previous: prev
                    });
                }
            },

            depth: {
                get: function() { return pad.childNodes.length; },
                set: function(value) {
                    var depth = pad.childNodes.length;
                    while (value > depth) {
                        pad.appendChild(spacer());
                        depth++;
                    }
                    while (value < depth) {
                        pad.removeChild(pad.firstChild);
                        depth--;
                    }
                }
            },

            element: {
                get: function() { return a; }
            },

            ext: {
                get: function() {
                    const index = fileName.lastIndexOf('.');
                    return index === -1 ? '' : fileName.substr(index + 1);
                }
            },

            metadata: {
                get: function() { return metadata },
                set: function(value) {
                    const prev = name;
                    name = value;
                    editor.emit('metadata', file, {
                        current: value,
                        previous: prev
                    });
                }
            },

            name: {
                get: function() { return name },
                set: function(value) {
                    const prev = name;
                    name = value;
                    editor.emit('name', file, {
                        current: value,
                        previous: prev
                    });
                }
            }

        });
    }

    File.prototype.select = function() {
        this.editor.emit('select', this);
    };


    function Directory(editor, name, metadata) {
        if (!(this instanceof Directory)) return new Directory(editor, name, metadata);
        if (!name) name = '';
        if (!metadata) metadata = {};

        const directory = this;
        this.editor = editor;
        this._items = {};

        const a = makeElement('span', 'code-editor file-structure branch link');
        a.addEventListener('click', function(e) {
            e.preventDefault();
            directory.select();
        });

        const pad = makeElement('span', 'code-editor file-structure padding');
        a.appendChild(pad);

        const label = makeElement('span', 'code-editor file-structure label', name);
        a.appendChild(label);

        const element = makeElement('div', 'code-editor file-structure branch-container');
        element.appendChild(a);

        // context
        makeContextMenu(a, [
            {
                label: 'New File',
                handler: function() {
                    editor.prompt('New file name:', directory.untitled(), function(submitted, value) {
                        if (submitted) { // noinspection JSAnnotator
                            const file = new File(editor, value);
                            directory.add(file);
                        }
                    });
                }
            },
            {
                label: 'New Directory',
                handler: function() {
                    editor.prompt('New directory name:', directory.untitled(), function(submitted, value) {
                        if (submitted) { // noinspection JSAnnotator
                            const dir = new Directory(editor, value);
                            directory.add(dir);
                        }
                    });
                }
            },
            {
                label: 'Rename',
                handler: function() {
                    editor.prompt('New file name:', name, function(submitted, value) {
                        if (submitted) { // noinspection JSAnnotator
                            directory.name = value;
                        }
                    });
                }
            },
            {
                label: 'Delete',
                handler: function() {
                    const parent = directory.element.parent.codeEditor;
                    parent.remove(directory);
                }
            }
        ]);

        Object.defineProperties(this, {

            depth: {
                get: function() { return pad.childNodes.length; },
                set: function(value) {
                    var depth = pad.childNodes.length;
                    while (value > depth) {
                        pad.appendChild(spacer());
                        depth++;
                    }
                    while (value < depth) {
                        pad.removeChild(pad.firstChild);
                        depth--;
                    }

                    Object.keys(directory._items).forEach(function(key) {
                        directory._items[key].depth = value + 1;
                    });
                }
            },

            element: {
                get: function() { return element; }
            },

            expanded: {
                get: function() { return ul.className.split(/ +/).indexOf('expanded') !== -1 },
                set: function(value) {
                    const prev = directory.expanded;
                    value = !!value;

                    if (prev !== value) {
                        ul.className = ul.className.split(/ +/)
                            .filter(function(value) { return value !== 'expanded' })
                            .join(' ');
                        if (value) ul.className += ' expanded';

                        editor.emit(value ? 'expand' : 'collapse', directory);
                    }
                }
            },

            metadata: {
                get: function() { return metadata },
                set: function(value) {
                    const prev = name;
                    name = value;
                    editor.emit('metadata', directory, {
                        current: value,
                        previous: prev
                    });
                }
            },

            name: {
                get: function() { return name },
                set: function(value) {
                    const prev = name;
                    name = value;
                    label.innerHTML = name;
                    editor.emit('rename', directory, {
                        current: value,
                        previous: prev
                    });
                }
            }

        });

    }

    Directory.prototype.add = function(item) {
        if (this._items[item.name]) throw Error('An item with that name already exists in the specified directory');
        this._items[item.name] = item;
        item.depth = this.depth + 1;

        // place the item in the correct location
        const directory = this;
        const keys = Object.keys(this._items);
        const length = keys.length;
        keys.sort(function(a, b) {
            a = directory._items[a];
            b = directory._items[b];
            if (a instanceof Directory && b instanceof File) return -1;
            if (a instanceof File && b instanceof Directory) return 1;
            return a.name < b.name ? -1 : 1
        });
        var i;
        for (i = 0; i < length; i++) {
            if (keys[i] === item.name) {
                if (i === length - 1) {
                    this.element.appendChild(item.element);
                } else {
                    this.element.insertBefore(item.element, this.element.children[i]);
                }
            }
        }

        this.editor.emit('add', this, item);
    };

    Directory.prototype.collapse = function() {
        this.expanded = false;
    };

    Directory.prototype.expand = function() {
        this.expanded = true;
    };

    Directory.prototype.remove = function(item) {
        item.element.parentNode.removeChild(item.element);
        delete this._items[item.name];
        this.editor.emit('remove', this, item);
    };

    Directory.prototype.select = function() {
        this.editor.emit('select', this);
    };

    Directory.prototype.untitled = function() {
        if (!this._items.untitled) return 'untitled';
        var index = 1;
        while (true) {
            if (!this._items['untitled' + index]) return 'untitled' + index;
            index++;
        }
    };


    function disabled(el, disabled) {
        el.disabled = disabled;
        toggleClass(el, 'disabled', disabled);
    }

    function makeContextMenu(target, config) {
        const container = makeElement('div', 'code-editor context-menu');
        const body = document.body;

        function remove() {
            body.removeChild(container);
            body.removeEventListener('click', remove);
        }

        config.forEach(function(item) {
            const el = makeElement('span', '', item.label);
            el.addEventListener('click', function(e) {
                e.preventDefault();
                remove();
                item.handler();
            });
            container.append(el);
        });

        target.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            console.log(e);
            container.style.left = e.clientX + 'px';
            container.style.top = e.clientY + 'px';
            body.appendChild(container);

            body.addEventListener('click', remove);
        });
    }

    function makeElement(tag, className, innerHTML) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        el.innerHTML = innerHTML || '';
        return el;
    }

    function spacer(className) {
        const el = makeElement('span', 'code-editor file-structure spacer');
        if (className) el.className += ' ' + className;
        return el;
    }

    function toggleClass(el, className, addRemove) {
        const ar = el.className.split(/ +/);
        className.split(/ +/).forEach(function(className) {
            const index = ar.indexOf(className);
            if (index === -1 && addRemove !== false) {
                ar.push(className);
            } else if (index !== -1 && addRemove !== true) {
                ar.splice(index, 1);
            }
        });
        el.className = ar.join(' ');
        if (!el.className) el.removeAttribute('class');
    }

}).call(this);
