// Copyright (c) 2016-21 Volker Sorge
// Copyright (c) 2016 The MathJax Consortium
//
// Licensed under the Apache on 2.0 (the "License");
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
 * @fileoverview Procedure to reassemble the semantic tree from an enriched
 *    MathML expression.
 *
 * @author v.sorge@mathjax.org (Volker Sorge)
 */

goog.provide('sre.RebuildStree');

goog.require('sre.EnrichMathml.Attribute');
goog.require('sre.SemanticAttr');
goog.require('sre.SemanticNodeFactory');
goog.require('sre.SemanticProcessor');
goog.require('sre.SemanticSkeleton');
goog.require('sre.SemanticTree');
goog.require('sre.WalkerUtil');



// Note that reassemble tree will not give you exactly the original tree, as the
// mathml nodes and mathml tree components can not be reconstructed.
/**
 * @constructor
 * @param {!Element} mathml The enriched MathML node.
 */
sre.RebuildStree = function(mathml) {

  /**
   * @type {sre.SemanticNodeFactory}
   */
  this.factory = new sre.SemanticNodeFactory();

  /**
   * @type {!Object.<!sre.SemanticNode>}
   */
  this.nodeDict = {};

  /**
   * @type {!Element}
   */
  this.mathml = mathml;

  /**
   * @type {!Node}
   */
  this.mmlRoot = sre.WalkerUtil.getSemanticRoot(mathml);

  /**
   * @type {!sre.SemanticNode}
   */
  this.streeRoot = this.assembleTree(this.mmlRoot);

  /**
   * @type {!sre.SemanticTree}
   */
  this.stree = sre.SemanticTree.fromNode(this.streeRoot, this.mathml);

  /**
   * @type {!Node}
   */
  this.xml = this.stree.xml();
  sre.SemanticProcessor.getInstance().setNodeFactory(this.factory);

};


/**
 * @return {sre.SemanticTree} The rebuilt semantic tree.
 */
sre.RebuildStree.prototype.getTree = function() {
  return this.stree;
};


/**
 * Adds external attributes if they exists. Recurses one level if we have a leaf
 * element with a none-text child.
 * @param {sre.SemanticNode} snode The semantic node.
 * @param {Node} node The mml node.
 * @param {boolean} leaf True if it is a leaf node.
 */
sre.RebuildStree.addAttributes = function(snode, node, leaf) {
  if (leaf && node.childNodes.length === 1 &&
      node.childNodes[0].nodeType !== sre.DomUtil.NodeType.TEXT_NODE) {
    sre.SemanticUtil.addAttributes(snode, node.childNodes[0]);
  }
  sre.SemanticUtil.addAttributes(snode, node);
};


/**
 * Assembles the semantic tree from the data attributes of the MathML node.
 * @param {!Node} node The MathML node.
 * @return {!sre.SemanticNode} The corresponding semantic tree node.
 */
sre.RebuildStree.prototype.assembleTree = function(node) {
  var snode = this.makeNode(node);
  var children = sre.WalkerUtil.splitAttribute(
      sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.CHILDREN));
  var content = sre.WalkerUtil.splitAttribute(
      sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.CONTENT));
  sre.RebuildStree.addAttributes(
      snode, node, !(children.length || content.length));
  if (content.length === 0 && children.length === 0) {
    sre.RebuildStree.textContent(snode, node);
    return snode;
  }
  if (content.length > 0) {
    var fcontent = sre.WalkerUtil.getBySemanticId(this.mathml, content[0]);
    if (fcontent) {
      sre.RebuildStree.textContent(snode, fcontent, true);
    }
  }
  var setParent = function(n) {
    var mml = sre.WalkerUtil.getBySemanticId(this.mathml, n);
    var sn = this.assembleTree(mml);
    sn.parent = snode;
    return sn;
  };
  snode.contentNodes = content.map(goog.bind(setParent, this));
  snode.childNodes = children.map(goog.bind(setParent, this));
  var collapsed = sre.WalkerUtil.getAttribute(
      node, sre.EnrichMathml.Attribute.COLLAPSED);
  return collapsed ? this.postProcess(snode, collapsed) : snode;
};


/**
 * Sets the text content of the semantic node. If no text content is available
 * or it is ignored, but an operator is given, it uses that.
 * @param {!sre.SemanticNode} snode The semantic node.
 * @param {!Node} node The mml node.
 * @param {boolean=} opt_ignore Ignores using text content.
 */
sre.RebuildStree.textContent = function(snode, node, opt_ignore) {
  if (!opt_ignore && node.textContent) {
    snode.textContent = node.textContent;
    return;
  }
  var operator = sre.WalkerUtil.splitAttribute(
      sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.OPERATOR));
  if (operator.length > 1) {
    snode.textContent = operator[1];
  }
};


/**
 * Creates a new semantic node from the data in the MathML node.
 * @param {!Node} node The enriched MathML node.
 * @return {!sre.SemanticNode} The reconstructed semantic tree node.
 */
sre.RebuildStree.prototype.makeNode = function(node) {
  var type = sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.TYPE);
  var role = sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.ROLE);
  var font = sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.FONT);
  var annotation = sre.WalkerUtil.getAttribute(
      node, sre.EnrichMathml.Attribute.ANNOTATION) || '';
  var id = sre.WalkerUtil.getAttribute(node, sre.EnrichMathml.Attribute.ID);
  var embellished = sre.WalkerUtil.getAttribute(
      node, sre.EnrichMathml.Attribute.EMBELLISHED);
  var fencepointer = sre.WalkerUtil.getAttribute(
      node, sre.EnrichMathml.Attribute.FENCEPOINTER);
  var snode = this.createNode(parseInt(id, 10));
  snode.type = /** @type {sre.SemanticAttr.Type} */(type);
  snode.role = /** @type {sre.SemanticAttr.Role} */(role);
  snode.font = font ? /** @type {sre.SemanticAttr.Font} */(font) :
      sre.SemanticAttr.Font.UNKNOWN;
  snode.parseAnnotation(annotation);
  if (fencepointer) {
    snode.fencePointer = fencepointer;
  }
  if (embellished) {
    snode.embellished = /** @type {sre.SemanticAttr.Type} */(embellished);
  }
  return snode;
};


/**
 * Tests is a collapsed attribute belongs to a punctuated index.
 * @param {!sre.SemanticSkeleton.Sexp} collapsed A skeleton structure.
 * @return {boolean} True if the skeleton indicates a collapsed punctuated
 *     element.
 */
sre.RebuildStree.isPunctuated = function(collapsed) {
  return !sre.SemanticSkeleton.simpleCollapseStructure(collapsed) &&
      collapsed[1] &&
      sre.SemanticSkeleton.contentCollapseStructure(collapsed[1]);
};


/**
 * Creates a punctuation node containing an invisible comma.
 * @param {number} id The id of the new node.
 * @return {!sre.SemanticNode} The newly created punctuation node.
 */
sre.RebuildStree.prototype.makePunctuation = function(id) {
  var node = this.createNode(id);
  node.updateContent(sre.SemanticAttr.invisibleComma());
  node.role = sre.SemanticAttr.Role.DUMMY;
  return node;
};


/**
 * Creates a punctuated node that serves as an index.
 * @param {!sre.SemanticNode} snode The semantic node that is being rebuilt.
 * @param {!sre.SemanticSkeleton.Sexp} collapsed A skeleton structure.
 * @param {!sre.SemanticAttr.Role} role The role of the new index node.
 */
sre.RebuildStree.prototype.makePunctuated = function(snode, collapsed, role) {
  var punctuated = this.createNode(collapsed[0]);
  punctuated.type = sre.SemanticAttr.Type.PUNCTUATED;
  punctuated.embellished = snode.embellished;
  punctuated.fencePointer = snode.fencePointer;
  punctuated.role = role;
  var cont = collapsed.splice(1, 1)[0].slice(1);
  punctuated.contentNodes = cont.map(goog.bind(this.makePunctuation, this));
  this.collapsedChildren_(collapsed);
};


/**
 * Creates an empty node that serves as an index.
 * @param {!sre.SemanticNode} snode The semantic node that is being rebuilt.
 * @param {number} collapsed A skeleton structure.
 * @param {!sre.SemanticAttr.Role} role The role of the new index node.
 */
sre.RebuildStree.prototype.makeEmpty = function(snode, collapsed, role) {
  var empty = this.createNode(collapsed);
  empty.type = sre.SemanticAttr.Type.EMPTY;
  empty.embellished = snode.embellished;
  empty.fencePointer = snode.fencePointer;
  empty.role = role;
};


/**
 * Creates an index node.
 * @param {!sre.SemanticNode} snode The semantic node that is being rebuilt.
 * @param {!sre.SemanticSkeleton.Sexp} collapsed A skeleton structure.
 * @param {!sre.SemanticAttr.Role} role The role of the new index node.
 */
sre.RebuildStree.prototype.makeIndex = function(snode, collapsed, role) {
  if (sre.RebuildStree.isPunctuated(collapsed)) {
    this.makePunctuated(snode, collapsed, role);
    collapsed = collapsed[0];
    return;
  }
  if (sre.SemanticSkeleton.simpleCollapseStructure(collapsed) &&
      !this.nodeDict[collapsed.toString()]) {
    this.makeEmpty(snode, /** @type {number} */ (collapsed), role);
  }
};


/**
 * Rearranges semantic node if there is a collapse structure.
 * @param {!sre.SemanticNode} snode The semantic node.
 * @param {string} collapsed The collapse structure.
 * @return {!sre.SemanticNode} The semantic node.
 */
sre.RebuildStree.prototype.postProcess = function(snode, collapsed) {
  var array = sre.SemanticSkeleton.fromString(collapsed).array;
  if (snode.type === sre.SemanticAttr.Role.SUBSUP) {
    var subscript = this.createNode(array[1][0]);
    subscript.type = sre.SemanticAttr.Type.SUBSCRIPT;
    subscript.role = sre.SemanticAttr.Role.SUBSUP;
    snode.type = sre.SemanticAttr.Type.SUPERSCRIPT;
    subscript.embellished = snode.embellished;
    subscript.fencePointer = snode.fencePointer;
    this.makeIndex(snode, array[1][2], sre.SemanticAttr.Role.RIGHTSUB);
    this.makeIndex(snode, array[2], sre.SemanticAttr.Role.RIGHTSUPER);
    this.collapsedChildren_(array);
    return snode;
  }
  if (snode.type === sre.SemanticAttr.Type.SUBSCRIPT) {
    this.makeIndex(snode, array[2], sre.SemanticAttr.Role.RIGHTSUB);
    this.collapsedChildren_(array);
    return snode;
  }
  if (snode.type === sre.SemanticAttr.Type.SUPERSCRIPT) {
    this.makeIndex(snode, array[2], sre.SemanticAttr.Role.RIGHTSUPER);
    this.collapsedChildren_(array);
    return snode;
  }
  if (snode.type === sre.SemanticAttr.Type.TENSOR) {
    this.makeIndex(snode, array[2], sre.SemanticAttr.Role.LEFTSUB);
    this.makeIndex(snode, array[3], sre.SemanticAttr.Role.LEFTSUPER);
    this.makeIndex(snode, array[4], sre.SemanticAttr.Role.RIGHTSUB);
    this.makeIndex(snode, array[5], sre.SemanticAttr.Role.RIGHTSUPER);
    this.collapsedChildren_(array);
    return snode;
  }
  if (snode.type === sre.SemanticAttr.Type.PUNCTUATED) {
    if (sre.RebuildStree.isPunctuated(array)) {
      var cont = array.splice(1, 1)[0].slice(1);
      snode.contentNodes = cont.map(goog.bind(this.makePunctuation, this));
    }
    return snode;
  }
  if (snode.type === sre.SemanticAttr.Role.UNDEROVER) {
    var score = this.createNode(array[1][0]);
    if (snode.childNodes[1].role === sre.SemanticAttr.Role.OVERACCENT) {
      score.type = sre.SemanticAttr.Type.OVERSCORE;
      snode.type = sre.SemanticAttr.Type.UNDERSCORE;
    } else {
      score.type = sre.SemanticAttr.Type.UNDERSCORE;
      snode.type = sre.SemanticAttr.Type.OVERSCORE;
    }
    score.role = sre.SemanticAttr.Role.UNDEROVER;
    score.embellished = snode.embellished;
    score.fencePointer = snode.fencePointer;
    this.collapsedChildren_(array);
    return snode;
  }
  return snode;
};


/**
 * Creates a new semantic tree node and stores it.
 * @param {number} id The id for that node.
 * @return {sre.SemanticNode} The newly created node.
 */
sre.RebuildStree.prototype.createNode = function(id) {
  var node = this.factory.makeNode(id);
  this.nodeDict[id.toString()] = node;
  return node;
};


/**
 * Recombines semantic nodes and children according to a given skeleton
 * structure.
 * @param {!sre.SemanticSkeleton.Sexp} collapsed Array of integer arrays.
 * @private
 */
sre.RebuildStree.prototype.collapsedChildren_ = function(collapsed) {
  var recurseCollapsed = goog.bind(function(coll) {
    var parent = this.nodeDict[coll[0]];
    parent.childNodes = [];
    for (var j = 1, l = coll.length; j < l; j++) {
      var id = coll[j];
      parent.childNodes.push(
          sre.SemanticSkeleton.simpleCollapseStructure(id) ?
          this.nodeDict[id] : recurseCollapsed(id));
    }
    return parent;
  }, this);
  recurseCollapsed(collapsed);
};
