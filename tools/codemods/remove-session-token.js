/**
 * JSCodeshift Codemod: Remove sessionToken Parameters
 * 
 * Systematically removes sessionToken parameters from function calls,
 * function declarations, and destructuring patterns throughout the codebase.
 * 
 * This is part of the single-token → dual-token OAuth 2.0 migration.
 */

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const source = j(fileInfo.source);
  let hasModifications = false;

  // 1. Remove sessionToken from function call arguments
  source.find(j.CallExpression).forEach(path => {
    const args = path.value.arguments;
    let modifiedArgs = false;

    // Look for arguments that are sessionToken identifiers or object properties
    for (let i = args.length - 1; i >= 0; i--) {
      const arg = args[i];
      
      // Remove direct sessionToken identifier arguments
      if (j.Identifier.check(arg) && arg.name === 'sessionToken') {
        args.splice(i, 1);
        modifiedArgs = true;
      }
    }

    if (modifiedArgs) {
      hasModifications = true;
      console.log(`Removed sessionToken argument from function call in ${fileInfo.path}`);
    }
  });

  // 2. Remove sessionToken parameters from function declarations and arrow functions
  source.find(j.Function).forEach(path => {
    const params = path.value.params;
    let modifiedParams = false;

    for (let i = params.length - 1; i >= 0; i--) {
      const param = params[i];
      
      // Remove sessionToken parameters
      if (j.Identifier.check(param) && param.name === 'sessionToken') {
        params.splice(i, 1);
        modifiedParams = true;
      }
    }

    if (modifiedParams) {
      hasModifications = true;
      console.log(`Removed sessionToken parameter from function in ${fileInfo.path}`);
    }
  });

  // 3. Remove sessionToken from arrow function parameters
  source.find(j.ArrowFunctionExpression).forEach(path => {
    const params = path.value.params;
    let modifiedParams = false;

    for (let i = params.length - 1; i >= 0; i--) {
      const param = params[i];
      
      if (j.Identifier.check(param) && param.name === 'sessionToken') {
        params.splice(i, 1);
        modifiedParams = true;
      }
    }

    if (modifiedParams) {
      hasModifications = true;
      console.log(`Removed sessionToken parameter from arrow function in ${fileInfo.path}`);
    }
  });

  // 4. Remove sessionToken from destructuring assignments
  source.find(j.VariableDeclarator).forEach(path => {
    if (j.ObjectPattern.check(path.value.id)) {
      const properties = path.value.id.properties;
      let modifiedDestructuring = false;

      for (let i = properties.length - 1; i >= 0; i--) {
        const prop = properties[i];
        
        if (j.ObjectProperty.check(prop) && 
            j.Identifier.check(prop.key) && 
            prop.key.name === 'sessionToken') {
          properties.splice(i, 1);
          modifiedDestructuring = true;
        }
      }

      if (modifiedDestructuring) {
        hasModifications = true;
        console.log(`Removed sessionToken from destructuring in ${fileInfo.path}`);
      }
    }
  });

  // 5. Remove sessionToken from object method parameters
  source.find(j.ObjectMethod).forEach(path => {
    const params = path.value.params;
    let modifiedParams = false;

    for (let i = params.length - 1; i >= 0; i--) {
      const param = params[i];
      
      if (j.Identifier.check(param) && param.name === 'sessionToken') {
        params.splice(i, 1);
        modifiedParams = true;
      }
    }

    if (modifiedParams) {
      hasModifications = true;
      console.log(`Removed sessionToken parameter from object method in ${fileInfo.path}`);
    }
  });

  // 6. Remove sessionToken properties from TypeScript interfaces (if applicable)
  source.find(j.TSInterfaceDeclaration).forEach(path => {
    if (path.value.body && path.value.body.body) {
      const members = path.value.body.body;
      let modifiedInterface = false;

      for (let i = members.length - 1; i >= 0; i--) {
        const member = members[i];
        
        if (j.TSPropertySignature.check(member) && 
            j.Identifier.check(member.key) && 
            member.key.name === 'sessionToken') {
          members.splice(i, 1);
          modifiedInterface = true;
        }
      }

      if (modifiedInterface) {
        hasModifications = true;
        console.log(`Removed sessionToken from interface in ${fileInfo.path}`);
      }
    }
  });

  // 7. Remove standalone sessionToken variable declarations
  source.find(j.VariableDeclarator).forEach(path => {
    if (j.Identifier.check(path.value.id) && 
        path.value.id.name === 'sessionToken' &&
        j.MemberExpression.check(path.value.init)) {
      
      // Check if it's a destructuring from useAuthStore or similar
      const init = path.value.init;
      if (j.CallExpression.check(init.object) || 
          (j.Identifier.check(init.object) && init.object.name.includes('Store'))) {
        
        // Add TODO comment for manual review
        const comment = j.commentLine(' TODO: sessionToken variable removed - verify logic still works');
        path.parent.value.leadingComments = path.parent.value.leadingComments || [];
        path.parent.value.leadingComments.push(comment);
        
        // Remove the entire variable declaration if it's the only declarator
        if (path.parent.value.declarations.length === 1) {
          path.parent.prune();
          hasModifications = true;
          console.log(`Removed sessionToken variable declaration in ${fileInfo.path}`);
        }
      }
    }
  });

  // 8. Remove sessionToken from dependency arrays
  source.find(j.ArrayExpression).forEach(path => {
    // Check if this is likely a dependency array (parent is useEffect, useCallback, etc.)
    const parent = path.parent;
    if (j.CallExpression.check(parent.value) && 
        j.Identifier.check(parent.value.callee) &&
        (parent.value.callee.name === 'useEffect' || 
         parent.value.callee.name === 'useCallback' ||
         parent.value.callee.name === 'useMemo')) {
      
      const elements = path.value.elements;
      let modifiedDeps = false;

      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        
        if (j.Identifier.check(element) && element.name === 'sessionToken') {
          elements.splice(i, 1);
          modifiedDeps = true;
        }
      }

      if (modifiedDeps) {
        hasModifications = true;
        console.log(`Removed sessionToken from dependency array in ${fileInfo.path}`);
      }
    }
  });

  return hasModifications ? source.toSource({
    quote: 'single',
    trailingComma: true,
  }) : fileInfo.source;
};

module.exports.parser = 'tsx';
