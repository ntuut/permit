/**
 * interface of an access node
 * an access must have a string scope and a string description
 */
export interface AccessNode {
  /**
   * get string scope of an access node
   *
   * @example
   * ```js
   * const access = createSchema(schema, { prefix: 'com.app', spacer: ':' })
   * console.log(access.todo.action.create.$scope)
   * // output: com.app:todo:action:create
   * ```
   */
  readonly $scope: string;
  /** return string description of an access node */
  readonly $description: string;
}

/**
 * Tree structure of an schema model to be used as an access tree.
 */
export type SchemaModel = {
  [k: string]: SchemaModel | string | AccessNode;
};

/**
 * interface of an access permit node.
 *
 * every node has a scope and a user with given scope has an access to specific task / feature of the scope.
 */
export interface PermitNode extends AccessNode {
  /** node utility to check it's scope permission access is true */
  readonly $ok: boolean;
  /** node utility to check it's scope permission access is false, counterpart of `$ok` */
  readonly $no: boolean;
}

/**
 * interface of an access permit branch.
 *
 * permit branch is a parent of a group of node.
 * Permit branch does not have a scope,
 * but can have a value and indeterminate value based on its child scope.
 */
export type PermitBranch<T extends SchemaModel> = {
  /**
   * branch utility to check is current branch has any true permission access node.
   *
   * @example
   * ```js
   * const permit = access.$permit(['todo.action.create'])
   * console.log(permit.is.todo.$some) // return true
   * ```
   */
  readonly $some: boolean;
  /**
   * branch utility to check is current branch has all false permission access node.
   *
   * @example
   * ```js
   * const permit = access.$permit(['todo.action.create'])
   * console.log(permit.is.todo.$none) // return false
   * ```
   */
  readonly $none: boolean;
  /**
   * branch utility to check is current branch has all true permission access node.
   *
   * @example
   * ```js
   * const permit = access.$permit(['todo.action.create'])
   * console.log(permit.is.todo.$all) // return false
   * ```
   */
  readonly $all: boolean;
  /** wrapper for `AccessBranch.$scopes` */
  readonly $scopes: AccessNode[];
} & {
  [K in keyof T]: T[K] extends SchemaModel
    ? T[K] extends { $scope: string }
      ? PermitNode
      : PermitBranch<T[K]>
    : PermitNode;
};

/**
 * Permit root interface.
 */
export type Permit<T extends SchemaModel> = {
  /** return an array of AccessNode that is granted or the scope is available. */
  readonly granted: AccessNode[];
  /** return an array of AccessNode that is denied or the scope is not available. */
  readonly denied: AccessNode[];
  /** wrapper for `AccessBranch.$scopes` utility. get all scopes in tree. */
  readonly scopes: AccessNode[];
  /** getter using schema model type that return utility for permission checking. */
  readonly is: PermitBranch<T>;

  /** reset permission to denied all permission. usefull for relogging user or clearing permission state. */
  reset: () => void;
  /**
   * grant given scope permission. for dinamicaly give permit a permission.
   *
   * @example
   * ```js
   * permit.grant('todo.action.delete', 'todo.action.update')
   * permit.is.todo.action.delete.$ok // return true
   * ```
   */
  grant: (...scopes: string[]) => void;
  /**
   * deny given scope permission. for dinamicaly remove permit a permission.
   *
   * @example
   * ```js
   * permit.deny('todo.action.delete', 'todo.action.update')
   * permit.is.todo.action.delete.$ok // return false
   * ```
   */
  deny: (...scopes: string[]) => void;
  /**
   * permission validation using string
   *
   * @example
   * ```js
   * const scope = 'todo.action.delete'
   * permit.check(scope) // return boolean
   * ```
   */
  check: (scope: string) => boolean;
};

/**
 * interface of an access permit branch.
 */
export type AccessBranch<T extends SchemaModel> = {
  /** return schema model object */
  readonly $model: SchemaModel;
  /** return an array of AccessNode usefull for exporting and insert to db process */
  readonly $scopes: AccessNode[];
  /**
   * utility function to loop through access tree and run given hook each node.
   *
   * @example
   * ```js
   * const access = createSchema(schema)
   * access.$each(node => console.log(node.$scope))
   *
   * // loop only in specific group
   * access.todo.$each(todoNode => console.log(todoNode.$scope))
   * ```
   */
  $each: (fn: (node: AccessNode) => void) => void;
  /**
   * generate permit utility for checking permission for specific user.
   *
   * @example
   * ```js
   * const permit = access.$permit(['todo.action.create'])
   *
   * //then in some part of your code you can use permit to check permission:
   * // this method will give you autocomplete using typescript type
   * permit.is.todo.action.create.$ok
   * // or
   * permit.check('todo.action.create')
   * ```
   */
  $permit: (granted?: string[]) => Permit<T>;
} & {
  [P in keyof T]: T[P] extends SchemaModel
    ? T[P] extends { $scope: string }
      ? AccessNode
      : AccessBranch<T[P]>
    : AccessNode;
};

export type SchemaOptions = {
  /** add prefix to scope. default to '' (none) */
  prefix: string;

  /** string to use for spacer for scope. default to '.' */
  spacer: string;
};

export type Simplify<T> = {
  [P in keyof T]: T[P];
} & {};
