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
 * @fileoverview Interface definition for a class which evaluates speech rules.
 *
 * A speech rule evaluator knows how to generate a description given a node and
 * a speech rule.
 * @author dtseng@google.com (David Tseng)
 */

goog.provide('sre.SpeechRuleEvaluator');



/**
 * @interface
 */
sre.SpeechRuleEvaluator = function() { };


/**
 * Default evaluation of a node if no speech rule is applicable.
 * @param {!Node} node The target node (or root of subtree).
 * @return {!Array.<sre.AuditoryDescription>} The resulting description.
 */
sre.SpeechRuleEvaluator.prototype.evaluateDefault = goog.abstractMethod;


/**
 * Default evaluation of a whitespace string.
 * @param {!string} str The string.
 * @return {!Array.<sre.AuditoryDescription>} The resulting description.
 */
sre.SpeechRuleEvaluator.prototype.evaluateWhitespace = goog.abstractMethod;


/**
 * Default evaluation of a string string.
 * @param {!string} str The string.
 * @return {!Array.<sre.AuditoryDescription>} The resulting description.
 */
sre.SpeechRuleEvaluator.prototype.evaluateString = goog.abstractMethod;


/**
 * Custom evaluation of a string.
 * @param {!string} str The string.
 * @return {sre.AuditoryDescription} The resulting description.
 */
sre.SpeechRuleEvaluator.prototype.evaluateCustom = goog.abstractMethod;


/**
 * Default evaluation of a character.
 * @param {!string} chr The character.
 * @return {!sre.AuditoryDescription} The resulting description.
 */
sre.SpeechRuleEvaluator.prototype.evaluateCharacter = goog.abstractMethod;
