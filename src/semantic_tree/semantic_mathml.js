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
 * @fileoverview A mathml parser for building semantic trees.
 *
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

goog.provide('sre.SemanticMathml');

goog.require('sre.DomUtil');
goog.require('sre.SemanticAbstractParser');
goog.require('sre.SemanticNode');
goog.require('sre.SemanticParser');
goog.require('sre.SemanticProcessor');



/**
 * @constructor
 * @extends {sre.SemanticAbstractParser}
 * @implements {sre.SemanticParser<Element>}
 */
sre.SemanticMathml = function() {
  sre.SemanticMathml.base(this, 'constructor', 'MathML');

  /**
   * @type {Object.<function(Element, Array.<Element>): !sre.SemanticNode>}
   * @private
   */
  this.parseMap_ = {
    'SEMANTICS': goog.bind(this.semantics_, this),
    'MATH': goog.bind(this.rows_, this),
    'MROW': goog.bind(this.rows_, this),
    'MPADDED': goog.bind(this.rows_, this),
    'MSTYLE': goog.bind(this.rows_, this),
    'MFRAC': goog.bind(this.fraction_, this),
    'MSUB': goog.bind(this.limits_, this),
    'MSUP': goog.bind(this.limits_, this),
    'MSUBSUP': goog.bind(this.limits_, this),
    'MOVER': goog.bind(this.limits_, this),
    'MUNDER': goog.bind(this.limits_, this),
    'MUNDEROVER': goog.bind(this.limits_, this),
    'MROOT': goog.bind(this.root_, this),
    'MSQRT': goog.bind(this.sqrt_, this),
    'MTABLE': goog.bind(this.table_, this),
    'MLABELEDTR': goog.bind(this.tableLabeledRow_, this),
    'MTR': goog.bind(this.tableRow_, this),
    'MTD': goog.bind(this.tableCell_, this),
    'MS': goog.bind(this.text_, this),
    'MTEXT': goog.bind(this.text_, this),
    'MSPACE': goog.bind(this.space_, this),
    'ANNOTATION-XML': goog.bind(this.text_, this),
    'MI': goog.bind(this.identifier_, this),
    'MN': goog.bind(this.number_, this),
    'MO': goog.bind(this.operator_, this),
    'MFENCED': goog.bind(this.fenced_, this),
    'MENCLOSE': goog.bind(this.enclosed_, this),
    'MMULTISCRIPTS': goog.bind(this.multiscripts_, this),
    'ANNOTATION': goog.bind(this.empty_, this),
    'NONE': goog.bind(this.empty_, this),
    'MACTION': goog.bind(this.action_, this)
  };

  let meaning = {
    type: sre.SemanticAttr.Type.IDENTIFIER,
    role: sre.SemanticAttr.Role.NUMBERSET,
    font: sre.SemanticAttr.Font.DOUBLESTRUCK
  };
  ['C', 'H', 'N', 'P', 'Q', 'R', 'Z', 'ℂ', 'ℍ', 'ℕ', 'ℙ', 'ℚ', 'ℝ', 'ℤ'].
      forEach(function(x) {
        this.getFactory().defaultMap.add(x, meaning);
      }.bind(this));

};
goog.inherits(sre.SemanticMathml, sre.SemanticAbstractParser);


/**
 * @override
 */
sre.SemanticMathml.prototype.parse = function(mml) {
  sre.SemanticProcessor.getInstance().setNodeFactory(this.getFactory());
  var children = sre.DomUtil.toArray(mml.childNodes);
  var tag = sre.DomUtil.tagName(mml);
  var func = this.parseMap_[tag];
  var newNode = (func ? func : goog.bind(this.dummy_, this))(mml, children);
  sre.SemanticUtil.addAttributes(newNode, mml);
  if (['MATH', 'MROW', 'MPADDED', 'MSTYLE', 'SEMANTICS'].indexOf(tag) !== -1) {
    return newNode;
  }
  newNode.mathml.unshift(mml);
  newNode.mathmlTree = mml;
  return newNode;
};


/**
 * Parses semantics elements.
 * @param {Element} node A MathML node.
 * @param {Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.semantics_ = function(node, children) {
  return children.length ? this.parse(children[0]) :
      this.getFactory().makeEmptyNode();
};


/**
 * Parses inferred row elements.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.rows_ = function(node, children) {
  // Special cases:
  let semantics = node.getAttribute('semantics');
  if (semantics && semantics.match('bspr_')) {
    return sre.SemanticProcessor.proof(
        node, semantics, goog.bind(this.parseList, this));
  }
  // End special cases.
  children = sre.SemanticUtil.purgeNodes(children);
  // Single child node, i.e. the row is meaningless.
  if (children.length === 1) {
    // TODO: Collate external attributes!
    var newNode = this.parse(children[0]);
    if (newNode.type === sre.SemanticAttr.Type.EMPTY && !newNode.mathmlTree) {
      newNode.mathmlTree = node;
    }
  } else {
    // Case of a 'meaningful' row, even if they are empty.
    newNode = sre.SemanticProcessor.getInstance().row(
        this.parseList(children));
  }
  newNode.mathml.unshift(node);
  return newNode;
};


/**
 * Parses fraction like elements.
 * @param {Element} node A MathML node.
 * @param {Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.fraction_ = function(node, children) {
  if (!children.length) {
    return this.getFactory().makeEmptyNode();
  }
  var upper = this.parse(children[0]);
  var lower = children[1] ? this.parse(children[1]) :
      this.getFactory().makeEmptyNode();
  var sem = sre.SemanticProcessor.getInstance().fractionLikeNode(
      upper, lower, node.getAttribute('linethickness'),
      node.getAttribute('bevelled') === 'true');
  return sem;
};


/**
 * Parses an expression with bounds.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.limits_ = function(node, children) {
  return sre.SemanticProcessor.getInstance().limitNode(
      sre.DomUtil.tagName(node), this.parseList(children));
};


/**
 * Parses a general root element.
 * @param {Element} node A MathML node.
 * @param {Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.root_ = function(node, children) {
  if (!children[1]) {
    return this.sqrt_(node, children);
  }
  return this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.ROOT,
      [this.parse(children[1]), this.parse(children[0])], []);
};


/**
 * Parses a square root element.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.sqrt_ = function(node, children) {
  var semNodes = this.parseList(sre.SemanticUtil.purgeNodes(children));
  return this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.SQRT,
      [sre.SemanticProcessor.getInstance().row(semNodes)], []);
};


/**
 * Parses a table structure.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.table_ = function(node, children) {
  let semantics = node.getAttribute('semantics');
  if (semantics && semantics.match('bspr_')) {
    return sre.SemanticProcessor.proof(
        node, semantics, goog.bind(this.parseList, this));
  }
  var newNode = this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.TABLE, this.parseList(children), []);
  sre.SemanticProcessor.tableToMultiline(newNode);
  return newNode;
};


/**
 * Parses a row of a table.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.tableRow_ = function(node, children) {
  var newNode = this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.ROW, this.parseList(children), []);
  newNode.role = sre.SemanticAttr.Role.TABLE;
  return newNode;
};


/**
 * Parses a row of a table.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.tableLabeledRow_ = function(node, children) {
  if (!children.length) {
    return this.tableRow_(node, children);
  }
  var label = this.parse(children[0]);
  label.role = sre.SemanticAttr.Role.LABEL;
  var newNode = this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.ROW, this.parseList(children.slice(1)), [label]);
  newNode.role = sre.SemanticAttr.Role.TABLE;
  return newNode;
};


/**
 * Parses a table cell.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.tableCell_ = function(node, children) {
  var semNodes = this.parseList(sre.SemanticUtil.purgeNodes(children));
  var childNodes;
  if (!semNodes.length) {
    childNodes = [];
  } else if (semNodes.length === 1 &&
             sre.SemanticPred.isAttribute('type', 'EMPTY')(semNodes[0])) {
    // In case we have an explicit empty node, we do not want to process it
    // again. However, we know there will be a mathml node to embed the semantic
    // information into if necessary.
    childNodes = semNodes;
  } else {
    childNodes = [sre.SemanticProcessor.getInstance().row(semNodes)];
  }
  var newNode = this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.CELL, childNodes, []);
  newNode.role = sre.SemanticAttr.Role.TABLE;
  return newNode;
};


/**
 * Parse a space element. If sufficiently wide, create an empty text element.
 * alpha only: ignore, em pc >= .5, cm >= .4, ex >= 1, in >= .15, pt mm >= 5.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.space_ = function(node, children) {
  var width = node.getAttribute('width');
  var match = width && width.match(/[a-z]*$/);
  if (!match) {
    return this.empty_(node, children);
  }
  var sizes = {
    'cm': .4, 'pc': .5, 'em': .5, 'ex': 1, 'in': .15, 'pt': 5, 'mm': 5
  };
  var unit = match[0];
  var measure = parseFloat(width.slice(0, match.index));
  var size = sizes[unit];
  if (!size || isNaN(measure) || measure < size) {
    return this.empty_(node, children);
  }
  var newNode = this.getFactory().makeUnprocessed(node);
  return sre.SemanticProcessor.getInstance().
      text(newNode, sre.DomUtil.tagName(node));
};


/**
 * Parses a text element.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.text_ = function(node, children) {
  var newNode = this.leaf_(node, children);
  if (!node.textContent) {
    return newNode;
  }
  newNode.updateContent(node.textContent, true);
  return sre.SemanticProcessor.getInstance().text(
      newNode,
      sre.DomUtil.tagName(node));
};


/**
 * Create an identifier node, with particular emphasis on font disambiguation.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The new semantic identifier node.
 * @private
 */
sre.SemanticMathml.prototype.identifier_ = function(node, children) {
  var newNode = this.leaf_(node, children);
  return sre.SemanticProcessor.getInstance().identifierNode(
      newNode,
      sre.SemanticProcessor.getInstance().font(
      node.getAttribute('mathvariant')),
      node.getAttribute('class'));
};


/**
 * Parses a number.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.number_ = function(node, children) {
  var newNode = this.leaf_(node, children);
  sre.SemanticProcessor.number(newNode);
  return newNode;
};


/**
 * Parses an operator.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.operator_ = function(node, children) {
  var newNode = this.leaf_(node, children);
  sre.SemanticProcessor.getInstance().operatorNode(newNode);
  return newNode;
};


/**
 * Parses a fenced element.
 * @param {!Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.fenced_ = function(node, children) {
  var semNodes = this.parseList(sre.SemanticUtil.purgeNodes(children));
  var sepValue = sre.SemanticMathml.getAttribute_(node, 'separators', ',');
  var open = sre.SemanticMathml.getAttribute_(node, 'open', '(');
  var close = sre.SemanticMathml.getAttribute_(node, 'close', ')');
  var newNode = sre.SemanticProcessor.getInstance().mfenced(
      open, close, sepValue, semNodes);
  var nodes = sre.SemanticProcessor.getInstance().tablesInRow([newNode]);
  return nodes[0];
};


/**
 * Parses an enclosed element.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.enclosed_ = function(node, children) {
  var semNodes = this.parseList(sre.SemanticUtil.purgeNodes(children));
  var newNode = this.getFactory().makeBranchNode(
      sre.SemanticAttr.Type.ENCLOSE,
      [sre.SemanticProcessor.getInstance().row(semNodes)], []);
  newNode.role =
      /** @type {!sre.SemanticAttr.Role} */(node.getAttribute('notation')) ||
      sre.SemanticAttr.Role.UNKNOWN;
  return newNode;
};


/**
 * Parses a mmultiscript node into a tensor representation.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The nodes children.
 * @return {!sre.SemanticNode} The semantic tensor node.
 * @private
 */
sre.SemanticMathml.prototype.multiscripts_ = function(node, children) {
  // Empty node. Illegal MathML markup, but valid in MathJax.
  if (!children.length) {
    return this.getFactory().makeEmptyNode();
  }
  var base = this.parse(
      /** @type {!Element} */(children.shift()));
  if (!children.length) {
    return base;
  }
  var lsup = [];
  var lsub = [];
  var rsup = [];
  var rsub = [];
  var prescripts = false;
  var scriptcount = 0;
  for (var i = 0, child; child = children[i]; i++) {
    if (sre.DomUtil.tagName(child) === 'MPRESCRIPTS') {
      prescripts = true;
      scriptcount = 0;
      continue;
    }
    prescripts ?
        (scriptcount & 1 ? lsup.push(child) : lsub.push(child)) :
        (scriptcount & 1 ? rsup.push(child) : rsub.push(child));
    scriptcount++;
  }
  // This is the pathological msubsup case.
  //
  // We retain NONE nodes if necessary, i.e., in a non-empty sub- or
  // superscript.
  if (!sre.SemanticUtil.purgeNodes(lsup).length &&
      !sre.SemanticUtil.purgeNodes(lsub).length) {
    return sre.SemanticProcessor.getInstance().pseudoTensor(
        base,
        this.parseList(rsub),
        this.parseList(rsup));
  }
  // We really deal with a multiscript tensor.
  //
  return sre.SemanticProcessor.getInstance().tensor(
      base,
      this.parseList(lsub),
      this.parseList(lsup),
      this.parseList(rsub),
      this.parseList(rsup));
};


/**
 * Parses an empty element.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.empty_ = function(node, children) {
  return this.getFactory().makeEmptyNode();
};


/**
 * Parses an actionable element.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.action_ = function(node, children) {
  // This here is currently geared towards our collapse actions!
  return children.length > 1 ? this.parse(children[1]) :
      this.getFactory().makeUnprocessed(node);
};


/**
 * Parses a dummy element for which no other case is known.
 * @param {Element} node A MathML node.
 * @param {!Array.<Element>} children The children of the node.
 * @return {!sre.SemanticNode} The newly created semantic node.
 * @private
 */
sre.SemanticMathml.prototype.dummy_ = function(node, children) {
  let unknown = this.getFactory().makeUnprocessed(node);
  unknown.role = /** @type {!sre.SemanticAttr.Role} */(node.tagName);
  unknown.textContent = node.textContent;
  return unknown;
};


/**
 * Creates a leaf node from MathML node.
 * @param {Element} mml The MathML node.
 * @param {Array.<Element>} children Its child nodes.
 * @return {!sre.SemanticNode} The new node.
 * @private
 */
sre.SemanticMathml.prototype.leaf_ = function(mml, children) {
  if (children.length === 1 &&
      children[0].nodeType !== sre.DomUtil.NodeType.TEXT_NODE) {
    let node = this.getFactory().makeUnprocessed(mml);
    node.role = /** @type {!sre.SemanticAttr.Role} */(children[0].tagName);
    sre.SemanticUtil.addAttributes(node, children[0]);
    return node;
  }
  return this.getFactory().makeLeafNode(
      mml.textContent,
      sre.SemanticProcessor.getInstance().font(
      mml.getAttribute('mathvariant')));
};


/**
 * Get an attribute from a node and provide a default if it does not exist.  It
 * returns null if attribute is empty string or whitespace only.
 * @param {!Element} node The node from which to retrieve the attribute.
 * @param {string} attr The attribute.
 * @param {string} def The default return value.
 * @return {?string} The value of the attribute or null.
 * @private
 */
sre.SemanticMathml.getAttribute_ = function(node, attr, def) {
  if (!node.hasAttribute(attr)) {
    return def;
  }
  var value = node.getAttribute(attr);
  if (value.match(/^\s*$/)) {
    return null;
  }
  return value;
};

// TODO (sorge) Role and font of multi-character and digits unicode strings.
// TODO (sorge) Reclassify wrongly tagged numbers or identifiers more
//              systematically.
// TODO (sorge) Put this all in a single clean reclassification method.
// TODO (sorge) Do something useful with error and phantom symbols.
