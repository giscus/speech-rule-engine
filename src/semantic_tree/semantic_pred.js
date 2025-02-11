// Copyright 2013 Google Inc.
// Copyright 2014-21 Volker Sorge
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Predicates collection for semantic tree generation.
 *
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

goog.provide('sre.SemanticPred');

goog.require('sre.SemanticAttr');


/**
 * Constructs a predicate to check the semantic attribute of a node.
 * @param {string} prop The property of a node.
 * @param {string} attr The attribute.
 * @return {function(sre.SemanticNode): boolean} The predicate.
 */

sre.SemanticPred.isAttribute = function(prop, attr) {
  var getAttr = function(prop) {
    switch (prop) {
      case 'role': return sre.SemanticAttr.Role[attr];
      case 'font': return sre.SemanticAttr.Font[attr];
      case 'embellished':
      case 'type':
      default: return sre.SemanticAttr.Type[attr];
    }
  };

  return function(node) {return node[prop] === getAttr(prop);};
};


/**
 * Checks whether a character can be considered as accent.
 * @param {!sre.SemanticNode} node The node to be tested.
 * @return {boolean} True if the node is a punctuation, fence or operator.
 */
sre.SemanticPred.isAccent = function(node) {
  return sre.SemanticPred.isAttribute('type', 'FENCE')(node) ||
      sre.SemanticPred.isAttribute('type', 'PUNCTUATION')(node) ||
      // TODO (sorge) Simplify this once meaning of all characters is fully
      // defined. Improve dealing with Infinity.
      (sre.SemanticPred.isAttribute('type', 'OPERATOR')(node) &&
       !node.textContent.match(new RegExp('∞|᪲'))) ||
      sre.SemanticPred.isAttribute('type', 'RELATION')(node) ||
      (sre.SemanticPred.isAttribute('type', 'IDENTIFIER')(node) &&
      sre.SemanticPred.isAttribute('role', 'UNKNOWN')(node) &&
       !node.textContent.match(new RegExp(
         (sre.SemanticAttr.getInstance()).allLetters.join('|') + '|∞|᪲')));
};


/**
 * Predicate implementing the boundary criteria for detecting simple functions:
 * 1. No arguments, e.g., f()
 * 2. Any arguments with the exception of:
 *  - Infix operations other than implicit multiplication.
 *
 * @param {!sre.SemanticNode} node A semantic node of type fenced.
 * @return {boolean} True if the node meets the boundary criteria.
 */
sre.SemanticPred.isSimpleFunctionScope = function(node) {
  var children = node.childNodes;
  if (children.length === 0) {
    return true;
  }
  if (children.length > 1) {
    return false;
  }
  var child = children[0];
  if (child.type === sre.SemanticAttr.Type.INFIXOP) {
    if (child.role !== sre.SemanticAttr.Role.IMPLICIT) {
      return false;
    }
    if (child.childNodes.some(
        sre.SemanticPred.isAttribute('type', 'INFIXOP'))) {
      return false;
    }
  }
  return true;
};


/**
 * Predicate implementing the boundary criteria for prefix functions.
 * 1. an explicit operator,
 * 2. another function application,
 * 3. a relation symbol, or
 * 4. some punctuation.
 * @param {sre.SemanticNode} node A semantic node.
 * @return {boolean} True if the node meets the boundary criteria.
 */
sre.SemanticPred.isPrefixFunctionBoundary = function(node) {
  return (sre.SemanticPred.isOperator(node) &&
          !sre.SemanticPred.isAttribute('role', 'DIVISION')(node)) ||
      sre.SemanticPred.isAttribute('type', 'APPL')(node) ||
      sre.SemanticPred.isGeneralFunctionBoundary(node);
};


/**
 * Predicate implementing the boundary criteria for big operators:
 * 1. an explicit operator,
 * 2. a relation symbol, or
 * 3. some punctuation.
 * @param {sre.SemanticNode} node A semantic node.
 * @return {boolean} True if the node meets the boundary criteria.
 */
sre.SemanticPred.isBigOpBoundary = function(node) {
  return sre.SemanticPred.isOperator(node) ||
      sre.SemanticPred.isGeneralFunctionBoundary(node);
};


/**
 * Predicate implementing the boundary criteria for integrals dx on two nodes.
 * @param {sre.SemanticNode} firstNode A semantic node.
 * @param {sre.SemanticNode} secondNode The direct neighbour of first
 *     Node.
 * @return {boolean} True if the second node exists and the first node is a 'd'.
 */
sre.SemanticPred.isIntegralDxBoundary = function(
    firstNode, secondNode) {
  return !!secondNode &&
      sre.SemanticPred.isAttribute('type', 'IDENTIFIER')(secondNode) &&
          sre.SemanticAttr.isCharacterD(firstNode.textContent);
};


/**
 * Predicate implementing the boundary criteria for integrals dx on a single
 * node.
 * @param {sre.SemanticNode} node A semantic node.
 * @return {boolean} True if the node meets the boundary criteria.
 */
sre.SemanticPred.isIntegralDxBoundarySingle = function(node) {
  if (sre.SemanticPred.isAttribute('type', 'IDENTIFIER')(node)) {
    var firstChar = node.textContent[0];
    return firstChar && node.textContent[1] &&
        sre.SemanticAttr.isCharacterD(firstChar);
  }
  return false;
};


/**
 * Predicate implementing the general boundary criteria for function operators:
 * 1. a relation symbol,
 * 2. some punctuation.
 * @param {sre.SemanticNode} node A semantic node.
 * @return {boolean} True if the node meets the boundary criteria.
 */
sre.SemanticPred.isGeneralFunctionBoundary = function(node) {
  return sre.SemanticPred.isRelation(node) ||
      sre.SemanticPred.isPunctuation(node);
};


/**
 * Determines if a node is embellished and returns its type in case it is.
 * @param {sre.SemanticNode} node A node to test.
 * @return {?sre.SemanticAttr.Type} The type of the node that is embellished.
 */
sre.SemanticPred.isEmbellished = function(node) {
  if (node.embellished) {
    return node.embellished;
  }
  if (sre.SemanticAttr.isEmbellishedType(node.type)) {
    return node.type;
  }
  return null;
};


/**
 * Determines if a node is an operator, regular or embellished.
 * @param {sre.SemanticNode} node A node to test.
 * @return {boolean} True if the node is considered as operator.
 */
sre.SemanticPred.isOperator = function(node) {
  return sre.SemanticPred.isAttribute('type', 'OPERATOR')(node) ||
      sre.SemanticPred.isAttribute('embellished', 'OPERATOR')(node);
};


/**
 * Determines if a node is an relation, regular or embellished.
 * @param {sre.SemanticNode} node A node to test.
 * @return {boolean} True if the node is considered as relation.
 */
sre.SemanticPred.isRelation = function(node) {
  return sre.SemanticPred.isAttribute('type', 'RELATION')(node) ||
      sre.SemanticPred.isAttribute('embellished', 'RELATION')(node);
};


/**
 * Determines if a node is an punctuation, regular or embellished.
 * @param {sre.SemanticNode} node A node to test.
 * @return {boolean} True if the node is considered as punctuation.
 */
sre.SemanticPred.isPunctuation = function(node) {
  return sre.SemanticPred.isAttribute('type', 'PUNCTUATION')(node) ||
      sre.SemanticPred.isAttribute('embellished', 'PUNCTUATION')(node);
};


/**
 * Determines if a node is an fence, regular or embellished.
 * @param {sre.SemanticNode} node A node to test.
 * @return {boolean} True if the node is considered as fence.
 */
sre.SemanticPred.isFence = function(node) {
  return sre.SemanticPred.isAttribute('type', 'FENCE')(node) ||
      sre.SemanticPred.isAttribute('embellished', 'FENCE')(node);
};


/**
 * Determines if a fence is eligible.
 *
 * Currently fences are not eligible if they are opening fences with right
 * indices, closing fences with left indices or fences with both left and right
 * indices.
 * @param {sre.SemanticNode} node A node to test.
 * @return {boolean} True if the node is considered as fence.
 */
sre.SemanticPred.isElligibleEmbellishedFence = function(node) {
  if (!node || !sre.SemanticPred.isFence(node)) {
    return false;
  }
  if (!node.embellished) {
    return true;
  }
  var bothSide = function(node) {
    return sre.SemanticPred.isAttribute('type', 'TENSOR')(node) &&
        (!sre.SemanticPred.isAttribute('type', 'EMPTY')(node.childNodes[1]) ||
         !sre.SemanticPred.isAttribute('type', 'EMPTY')(node.childNodes[2])) &&
        (!sre.SemanticPred.isAttribute('type', 'EMPTY')(node.childNodes[3]) ||
         !sre.SemanticPred.isAttribute('type', 'EMPTY')(node.childNodes[4]));
  };
  var recurseBaseNode = function(node) {
    if (!node.embellished) {
      return true;
    }
    if (bothSide(node)) {
      return false;
    }
    if (sre.SemanticPred.isAttribute('role', 'CLOSE')(node) &&
        sre.SemanticPred.isAttribute('type', 'TENSOR')(node)) {
      return false;
    }
    if (sre.SemanticPred.isAttribute('role', 'OPEN')(node) &&
        (sre.SemanticPred.isAttribute('type', 'SUBSCRIPT')(node) ||
         sre.SemanticPred.isAttribute('type', 'SUPERSCRIPT')(node))) {
      return false;
    }
    return recurseBaseNode(node.childNodes[0]);
  };
  return recurseBaseNode(node);
};


/**
 * Decides if a node is a table or multiline element.
 * @param {sre.SemanticNode} node A node.
 * @return {boolean} True if node is either table or multiline.
 */
sre.SemanticPred.isTableOrMultiline = function(node) {
  return !!node && (sre.SemanticPred.isAttribute('type', 'TABLE')(node) ||
      sre.SemanticPred.isAttribute('type', 'MULTILINE')(node));
};


/**
 * Heuristic to decide if we have a matrix: An expression fenced on both sides
 * without any other content is considered a fenced node.
 * @param {sre.SemanticNode} node A node.
 * @return {boolean} True if we believe we have a matrix.
 */
sre.SemanticPred.tableIsMatrixOrVector = function(node) {
  return !!node && sre.SemanticPred.isFencedElement(node) &&
      sre.SemanticPred.isTableOrMultiline(node.childNodes[0]);
};


/**
 * Decides if a node is a single, simply fenced element.
 * @param {sre.SemanticNode} node A node.
 * @return {boolean} True if the node is fence left right or neutral with a
 *     single contained element.
 */
sre.SemanticPred.isFencedElement = function(node) {
  return !!node && sre.SemanticPred.isAttribute('type', 'FENCED')(node) &&
      (sre.SemanticPred.isAttribute('role', 'LEFTRIGHT')(node) ||
      sre.SemanticPred.isAttribute('role', 'NEUTRAL')(node)) &&
      node.childNodes.length === 1;
};


/**
 * Heuristic to decide if we have a case statement: An expression with a
 * singular open fence before it.
 * @param {!sre.SemanticNode} table A table node.
 * @param {!Array.<sre.SemanticNode>} prevNodes A list of previous nodes.
 * @return {boolean} True if we believe we have a case statement.
 */
sre.SemanticPred.tableIsCases = function(table, prevNodes) {
  return prevNodes.length > 0 &&
      sre.SemanticPred.isAttribute('role', 'OPENFENCE')(
          prevNodes[prevNodes.length - 1]);
};


/**
 * Heuristic to decide if we have a multiline formula. A table is considered a
 * multiline formula if it does not have any separate cells.
 * @param {!sre.SemanticNode} table A table node.
 * @return {boolean} True if we believe we have a mulitline formula.
 */
sre.SemanticPred.tableIsMultiline = function(table) {
  return table.childNodes.every(
      function(row) {
        var length = row.childNodes.length;
        return length <= 1;});
};


/**
 * Heuristic to decide if a table has a binomial form.
 * @param {!sre.SemanticNode} table A table node.
 * @return {boolean} True if it is a binomial form.
 */
sre.SemanticPred.isBinomial = function(table) {
  return table.childNodes.length === 2;
};


/**
 * Heuristic to decide if a node is a suitable center of a limit node.
 * @param {!sre.SemanticNode} node The center node.
 * @return {boolean} True if node is a large operator, already a limit node or a
 *    limit function.
 */
sre.SemanticPred.isLimitBase = function(node) {
  return sre.SemanticPred.isAttribute('type', 'LARGEOP')(node) ||
      sre.SemanticPred.isAttribute('type', 'LIMBOTH')(node) ||
      sre.SemanticPred.isAttribute('type', 'LIMLOWER')(node) ||
      sre.SemanticPred.isAttribute('type', 'LIMUPPER')(node) ||
      (sre.SemanticPred.isAttribute('type', 'FUNCTION')(node) &&
       sre.SemanticPred.isAttribute('role', 'LIMFUNC')(node)) ||
      ((sre.SemanticPred.isAttribute('type', 'OVERSCORE')(node) ||
        sre.SemanticPred.isAttribute('type', 'UNDERSCORE')(node)) &&
       sre.SemanticPred.isLimitBase(
         /** @type {!sre.SemanticNode} */(node.childNodes[0])));
};


/**
 * Predicate deciding whether a symbol is the head of a simple function.
 * @param {!sre.SemanticNode} node A semantic node.
 * @return {boolean} True if node is an identifier or a simple letter.
 */
sre.SemanticPred.isSimpleFunctionHead = function(node) {
  return (node.type === sre.SemanticAttr.Type.IDENTIFIER ||
          node.role === sre.SemanticAttr.Role.LATINLETTER ||
          node.role === sre.SemanticAttr.Role.GREEKLETTER ||
          node.role === sre.SemanticAttr.Role.OTHERLETTER);
};


/**
 * Given a list of punctuated node and their containing puncutations, decides if
 * there is exactly one punctuation, which is at the given position. Will
 * therefore return false if the puncutation is a dummy in a text sequence.
 * @param {!Array.<sre.SemanticNode>} nodes A list of punctuated nodes.
 * @param {!Array.<sre.SemanticNode>} puncts The associated punctuations.
 * @param {number} position The position in nodes to test for puncutation.
 * @return {boolean} True if puncts is a singleton and is the indeed the
 *     punctuation at the given position.
 */
sre.SemanticPred.singlePunctAtPosition = function(nodes, puncts, position) {
  return puncts.length === 1 &&
      (nodes[position].type === sre.SemanticAttr.Type.PUNCTUATION ||
      nodes[position].embellished === sre.SemanticAttr.Type.PUNCTUATION) &&
      nodes[position] === puncts[0];
};


/**
 * Is the node a simple function?
 * @param {sre.SemanticNode} node The node.
 * @return {boolean} True if node is an identifier with role simple function.
 */
sre.SemanticPred.isSimpleFunction = function(node) {
  return sre.SemanticPred.isAttribute('type', 'IDENTIFIER')(node) &&
      sre.SemanticPred.isAttribute('role', 'SIMPLEFUNC')(node);
};


/**
 * Is the node a left brace?
 * @param {sre.SemanticNode} node The node.
 * @return {boolean} True if the node is a left brace.
 */
sre.SemanticPred.isLeftBrace = function(node) {
  var leftBrace = ['{', '﹛', '｛']; // ['0x007B', '0xFE5B', '0xFF5B'];
  return !!node && leftBrace.indexOf(node.textContent) !== -1;
};


/**
 * Is the node a right brace?
 * @param {sre.SemanticNode} node The node.
 * @return {boolean} True if the node is a right brace.
 */
sre.SemanticPred.isRightBrace = function(node) {
  var rightBrace = ['}', '﹜', '｝']; // ['0x007D', '0xFE5C', '0xFF5D'];
  return !!node && rightBrace.indexOf(node.textContent) !== -1;
};


/**
 * Is the node a set like node, i.e., a fenced node with braces.
 * @param {sre.SemanticNode} node The node.
 * @return {boolean} True if the node is a set.
 */
sre.SemanticPred.isSetNode = function(node) {
  return sre.SemanticPred.isLeftBrace(node.contentNodes[0]) &&
      sre.SemanticPred.isRightBrace(node.contentNodes[1]);
};


// TODO: Rewrite as dictionary or map!
/**
 * @type {Array.<sre.SemanticAttr.Type>}
 * @private
 */
sre.SemanticPred.illegalSingleton_ = [
  sre.SemanticAttr.Type.PUNCTUATION,
  sre.SemanticAttr.Type.PUNCTUATED,
  sre.SemanticAttr.Type.RELSEQ,
  sre.SemanticAttr.Type.MULTIREL,
  sre.SemanticAttr.Type.TABLE,
  sre.SemanticAttr.Type.MULTILINE,
  sre.SemanticAttr.Type.CASES,
  sre.SemanticAttr.Type.INFERENCE
];


/**
 * @type {Array.<sre.SemanticAttr.Type>}
 * @private
 */
sre.SemanticPred.scriptedElement_ = [
  sre.SemanticAttr.Type.LIMUPPER,
  sre.SemanticAttr.Type.LIMLOWER,
  sre.SemanticAttr.Type.LIMBOTH,
  sre.SemanticAttr.Type.SUBSCRIPT,
  sre.SemanticAttr.Type.SUPERSCRIPT,
  sre.SemanticAttr.Type.UNDERSCORE,
  sre.SemanticAttr.Type.OVERSCORE,
  sre.SemanticAttr.Type.TENSOR
];


/**
 * Is the node a likely candidate for a singleton set element.
 * @param {sre.SemanticNode} node The node.
 * @return {boolean} True if the node is a set.
 */
sre.SemanticPred.isSingletonSetContent = function(node) {
  let type = node.type;
  if (sre.SemanticPred.illegalSingleton_.indexOf(type) !== -1 ||
      (type === sre.SemanticAttr.Type.INFIXOP &&
       node.role !== sre.SemanticAttr.Role.IMPLICIT)) {
    return false;
  }
  if (type === sre.SemanticAttr.Type.FENCED) {
    return node.role === sre.SemanticAttr.Role.LEFTRIGHT ?
        sre.SemanticPred.isSingletonSetContent(node.childNodes[0]) :
        true;
  }
  if (sre.SemanticPred.scriptedElement_.indexOf(type) !== -1) {
    return sre.SemanticPred.isSingletonSetContent(node.childNodes[0]);
  }
  return true;
};


/**
 * Tests if a number an integer or a decimal.
 * @param {sre.SemanticNode} node The semantic node.
 * @return {boolean} True if the number is an integer or a decimal.
 */
sre.SemanticPred.isNumber = function(node) {
  return node.type === sre.SemanticAttr.Type.NUMBER &&
      (node.role === sre.SemanticAttr.Role.INTEGER ||
           node.role === sre.SemanticAttr.Role.FLOAT);
};


/**
 * Tests if a node is elligible as a unit counter. I.e., an integer or a
 * decimal, a vulgar fraction or a mixed number.
 *
 * Note, that minus prefixes become negative sign of the entire unit expression.
 * @param {sre.SemanticNode} node The semantic node.
 * @return {boolean} True if the number is an integer or a decimal.
 */
sre.SemanticPred.isUnitCounter = function(node) {
  return sre.SemanticPred.isNumber(node) ||
      node.role === sre.SemanticAttr.Role.VULGAR ||
      node.role === sre.SemanticAttr.Role.MIXED;
};


/**
 * Tests if a node is pure unit, i.e., a singleton unit or a unit expression
 * without a counter.
 * @param {sre.SemanticNode} node The semantic node.
 * @return {boolean} True if the node is a pure unit expression.
 */
sre.SemanticPred.isPureUnit = function(node) {
  var children = node.childNodes;
  return node.role === sre.SemanticAttr.Role.UNIT && (
      !children.length || children[0].role === sre.SemanticAttr.Role.UNIT
  );
};


/**
 * Tests if a node is an implicit node or a unit node representing an implicit
 * node.
 * @param {sre.SemanticNode} node The semantic node.
 * @return {boolean} True if the node is considered an implicit node.
 */
sre.SemanticPred.isImplicit = function(node) {
  return node.role === sre.SemanticAttr.Role.IMPLICIT ||
      (node.role === sre.SemanticAttr.Role.UNIT &&
      !!node.contentNodes.length &&
      node.contentNodes[0].textContent === sre.SemanticAttr.invisibleTimes()
      );
};


/**
 * Tests if a node is an implicit operator node only.
 * @param {sre.SemanticNode} node The semantic node.
 * @return {boolean} True if the node is a true implicit operator node.
 */
sre.SemanticPred.isImplicitOp = function(node) {
  return node.type === sre.SemanticAttr.Type.INFIXOP &&
      node.role === sre.SemanticAttr.Role.IMPLICIT;
};


/**
 * Comparison operation for neutral fences depending on textual equality of the
 * (innermost for embellished) fences.
 * @param {sre.SemanticNode} fence1 First fence to compare.
 * @param {sre.SemanticNode} fence2 Second fence to compare.
 * @return {boolean} True if both fences are neutral and have same textual
 *     content.
 */
sre.SemanticPred.compareNeutralFences = function(fence1, fence2) {
  return fence1.role === sre.SemanticAttr.Role.NEUTRAL &&
      fence2.role === sre.SemanticAttr.Role.NEUTRAL &&
      sre.SemanticUtil.getEmbellishedInner(fence1).textContent ==
      sre.SemanticUtil.getEmbellishedInner(fence2).textContent;
};


/**
 * Fence is ellibigle as a left neutral fence, if it is either not embellished
 * or all its embellishments are to the left.
 * @param {sre.SemanticNode} fence The neutral fence to check.
 * @return {boolean} True if fence is elligible.
 */
sre.SemanticPred.elligibleLeftNeutral = function(fence) {
  if (fence.role !== sre.SemanticAttr.Role.NEUTRAL) return false;
  if (!fence.embellished) return true;
  if (fence.type === sre.SemanticAttr.Type.SUPERSCRIPT ||
      fence.type === sre.SemanticAttr.Type.SUBSCRIPT) return false;
  if (fence.type === sre.SemanticAttr.Type.TENSOR &&
      (fence.childNodes[3].type !== sre.SemanticAttr.Type.EMPTY ||
       fence.childNodes[4].type !== sre.SemanticAttr.Type.EMPTY)) return false;
  return true;
};


/**
 * Fence is ellibigle as a right neutral fence, if it is either not embellished
 * or all its embellishments are to the right.
 * @param {sre.SemanticNode} fence The neutral fence to check.
 * @return {boolean} True if fence is elligible.
 */
sre.SemanticPred.elligibleRightNeutral = function(fence) {
  if (fence.role !== sre.SemanticAttr.Role.NEUTRAL) return false;
  if (!fence.embellished) return true;
  if (fence.type === sre.SemanticAttr.Type.TENSOR &&
      (fence.childNodes[1].type !== sre.SemanticAttr.Type.EMPTY ||
       fence.childNodes[2].type !== sre.SemanticAttr.Type.EMPTY)) return false;
  return true;
};
