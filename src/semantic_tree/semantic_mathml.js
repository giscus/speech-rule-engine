// Copyright 2014-16 Volker Sorge
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

goog.require('sre.SemanticAbstractParser');
goog.require('sre.SemanticNode');
goog.require('sre.SemanticNodeFactory');
goog.require('sre.SemanticParser');
goog.require('sre.SemanticProcessor');



/**
 * @constructor
 * @extends {sre.SemanticAbstractParser}
 * @implements {sre.SemanticParser<Element>}
 */
sre.SemanticMathml = function() {
  sre.SemanticMathml.base(this, 'constructor', 'MathML');
};
goog.inherits(sre.SemanticMathml, sre.SemanticAbstractParser);


