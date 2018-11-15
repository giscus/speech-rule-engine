// Copyright 2018 Volker Sorge
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
 * @fileoverview Specialist computations to deal with proofs and inferences.
 *
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

goog.provide('sre.CaseProof');

goog.require('sre.AbstractEnrichCase');
goog.require('sre.DomUtil');
goog.require('sre.EnrichMathml');
goog.require('sre.SemanticAttr');



/**
 * @constructor
 * @extends {sre.AbstractEnrichCase}
 * @override
 */
sre.CaseProof = function(semantic) {
  sre.CaseProof.base(this, 'constructor', semantic);

  /**
   * @type {!Element}
   */
  this.mml = semantic.mathmlTree;

};
goog.inherits(sre.CaseProof, sre.AbstractEnrichCase);


/**
 * @override
 */
sre.CaseProof.test = function(semantic) {
  return semantic.mathmlTree &&
    (semantic.type === sre.SemanticAttr.Type.INFERENCE ||
     semantic.type === sre.SemanticAttr.Type.PREMISES);
};


/**
 * @override
 */
sre.CaseProof.prototype.getMathml = function() {
  console.log('Getting math for: ' + this.semantic.type);
  console.log(this.mml);
  if (!this.semantic.childNodes.length) {
    return this.mml;
  }
  this.semantic.childNodes.forEach(
    function(x) {
      sre.EnrichMathml.walkTree(/**@type{!sre.SemanticNode}*/(x));
    });
  sre.EnrichMathml.setAttributes(this.mml, this.semantic);
  return this.mml;
};
