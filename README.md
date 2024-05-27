# @ntut/permit

Easy access control tree for your application.

features:
1. autocomplete access node. no more miss type your access scope again.
2. easy group check permission. using permit branch, we can make sure user has multiple scope or none scope at all.
3. no dependencies, small packages.
4. run every where. so simple that it can be run in every js runtime.

installation:
```bash
# deno
deno add @ntut/permit
# npm
npx jsr add @ntut/permit
# pnpm
pnpm dlx jsr add @ntut/permit
# bun
bunx jsr add @ntut/permit
```

## Usage

### Defining your access schema model

permit use tree formated js object structure. this way we could extract the type and used that to create grouping of scope and autocomplete it so we do not need to remember every exact user scope again.

```js
// creating access schema model is easy. just create a simple js object as you always do.
// but note that every scope need to has a string description of the access node.

// here is example of simple todo app schema model:
const schema = {
    todo: {
        view: "Access todo view page",
        action: {
            create: "Create new todo",
            update: "Update todo",
            delete: "Delete todo",
        }
    },
    users: {
        view: "Access user management view page",
        action: {
            create: "Create new user",
            update: "Update user",
            delete: "Delete user",
        }
    },
}
```

see that every property with string type is an access node like `todo.view` and `todo.action.create`.
every access node will have a scope that you could store in a database and mapped it to user that has a permission to do so.

### Defining specific scope for a specific node (Overiding scope generation)

```js
const schema = {
    todo: {
        view: {
            $scope: 'com.app.todo:view@todo-page',
            $description: 'use static string value as a scope'
        },
        create: 'Create new todo'
    }
}
```

with the example above. `todo.view` scope won't be generated using schema options given but will have a static scope given.
generated scope will result to: `[ 'com.app.todo:view@todo-page', 'todo.create' ]`

### Verify user permission

```js
/**
 * array of scope available for current logged in user
 * @type string[]
 * */
const permission = getUserData().role.permission

const permit = access.$permit(permission)
if (permit.is.todo.action.create.$ok) {
    console.log('user able to create todo item')
} else {
    console.log('user has no access to create todo')
}
```

permit can also be created from a small part of a branch in access tree.
this method could be used in MPA or SSR application.

```js
const permit = access.todo.action.$permit(permission)
if (permit.is.create.$no) {
    console.log('user has no access to create todo')
} else {
    console.log('user able to create todo item')
}
```

## API Documentation

### AccessNode

#### `readonly $scope: string`

get string scope of an access node

```js
const access = createSchema(schema, { prefix: 'com.app', spacer: ':' })
console.log(access.todo.action.create.$scope)
// output: com.app:todo:action:create
```

#### `readonly $description: string`

return string description of an access node

### AccessBranch

#### `readonly $model: SchemaModel`

return schema model object

#### `readonly $scopes: AccessNode[]`

return an array of AccessNode usefull for exporting and insert to db process

#### `$each(fn: (node: AccessNode): void): void`

utility function to loop through access tree and run given hook each node.

```js
const access = createSchema(schema)
access.$each(node => console.log(node.$scope))

// loop only in specific group
access.todo.$each(todoNode => console.log(todoNode.$scope))
```

#### `AccessBranch<T>.$permit(granted?: string[]): Permit<T>`

generate permit utility for checking permission for specific user.

```js
const permit = access.$permit(['todo.action.create'])

//then in some part of your code you can use permit to check permission:
// this method will give you autocomplete using typescript type
permit.is.todo.action.create.$ok
// or
permit.check('todo.action.create')
```

### Permit

#### `readonly granted: AccessNode[]`

return an array of AccessNode that is granted or the scope is available.

#### `readonly denied: AccessNode[]`

return an array of AccessNode that is denied or the scope is not available.

#### `readonly scopes: AccessNode[]`

wrapper for `AccessBranch.$scopes` utility. get all scopes in tree.

#### `readonly is: PermitBranch<T>`

getter using schema model type that return utility for permission checking.

#### `reset(): void`

reset permission to denied all permission. usefull for relogging user or clearing permission state.

#### `grant(...scopes: string[]): void`

grant given scope permission. for dinamicaly give permit a permission.

```js
permit.grant('todo.action.delete', 'todo.action.update')
permit.is.todo.action.delete.$ok // return true
```

#### `deny(...scopes: string[]): void`

deny given scope permission. for dinamicaly remove permit a permission.

```js
permit.deny('todo.action.delete', 'todo.action.update')
permit.is.todo.action.delete.$ok // return false
```

#### `check(scope: string): boolean`

permission validation using string

```js
const scope = 'todo.action.delete'
permit.check(scope) // return boolean
```

### PermitBranch

#### `readonly $some: boolean`

branch utility to check is current branch has any true permission access node.

```js
const permit = access.$permit(['todo.action.create'])
console.log(permit.is.todo.$some) // return true
```

#### `readonly $none: boolean`

branch utility to check is current branch has all false permission access node.

```js
const permit = access.$permit(['todo.action.create'])
console.log(permit.is.todo.$none) // return false
```

#### `readonly $all: boolean`

branch utility to check is current branch has all true permission access node.

```js
const permit = access.$permit(['todo.action.create'])
console.log(permit.is.todo.$all) // return false
```

#### `readonly $scopes: AccessNode[]`

wrapper for `AccessBranch.$scopes`.

### PermitNode

#### `readonly $ok: boolean`

node utility to check it's scope permission access is true

#### `readonly $no: boolean`

node utility to check it's scope permission access is false, counterpart of `$ok`.