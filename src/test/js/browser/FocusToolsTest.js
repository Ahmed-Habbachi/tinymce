asynctest(
  'FocusToolsTest',
 
  [
    'ephox.agar.api.Assertions',
    'ephox.agar.api.Chain',
    'ephox.agar.api.FocusTools',
    'ephox.agar.api.Guard',
    'ephox.agar.api.Pipeline',
    'ephox.agar.api.RawAssertions',
    'ephox.agar.api.Step',
    'ephox.agar.test.DomContainers',
    'ephox.sugar.api.node.Element',
    'ephox.sugar.api.properties.Value',
    'global!document'
  ],
 
  function (Assertions, Chain, FocusTools, Guard, Pipeline, RawAssertions, Step, DomContainers, Element, Value, document) {
    var success = arguments[arguments.length - 2];
    var failure = arguments[arguments.length - 1];

    var doc = Element.fromDom(document);
    var docNode = Element.fromDom(document.documentElement);

    Pipeline.async({}, [
      DomContainers.mSetup,
      Step.log('cat1'),
      FocusTools.sSetFocus('Focusing body', docNode, 'body'),
      Step.log('cat2'),
      FocusTools.sIsOnSelector('Should be on body', doc, 'body'),
      FocusTools.sSetFocus('Focusing div', docNode, 'div[test-id]'),
      FocusTools.sIsOnSelector('Should be on div[test-id]', doc, 'div[test-id]'),
      FocusTools.sSetFocus('Focusing input', docNode, 'div[test-id] input'),
      FocusTools.sIsOnSelector('Should be on div[test-id] input', doc, 'div[test-id] input'),
      FocusTools.sSetActiveValue(doc, 'new value'),

      Chain.asStep(doc, [
        FocusTools.cGetFocused,
        Chain.control(
          Chain.on(function (active, next, die) {
            RawAssertions.assertEq('Should be expected value', 'new value', Value.get(active));
            next(Chain.wrap(active));
          }),
          Guard.addLogging('Asserting the value of the input field after it has been set.')
        )
      ]),
      Step.stateful(function (state, next, die) {
        FocusTools.sIsOn('checking that sIsOn works', state.input)(state, next, die);
      }),
      FocusTools.sTryOnSelector(
        'Should be on div[test-id] input', 
        doc,
        'div[test-id] input'
      ),
      FocusTools.sSetFocus('Focusing div again', docNode, 'div[test-id]'),
      FocusTools.sIsOnSelector('Should be on div again', doc, 'div[test-id]'),

      // Check that try until not is working for sIsOn, sIsOnSelector and sTryOnSelector
      Step.control(
        FocusTools.sIsOn('tryUntilNotCheck (sIsOn)', Element.fromTag('span')),
        Guard.tryUntilNot(
          'Focus should not be on something that is not in the DOM',
          100,
          1000
        )
      ),

      Step.control(
        FocusTools.sIsOnSelector('tryUntilNotCheck (sIsOnSelector)', doc, '.not-really-there'),
        Guard.tryUntilNot(
          'Focus should not be on something that is not there',
          100,
          1000
        )
      ),

      Step.control(
        FocusTools.sTryOnSelector('tryUntilNotCheck (sTryOnSelector)', doc, '.not-really-there'),
        Guard.tryUntilNot(
          'Focus should not be on something that is not there',
          100,
          1000
        )
      ),

      // TODO: Need to get rid of this boilerplate
      Step.stateful(function (value, next, die) {
        Chain.asStep(value.container, [
          FocusTools.cSetFocus('Setting focus via chains on the input', 'input')
        ])(value, next, die);
      }),
      FocusTools.sIsOnSelector('Should now be on input again', doc, 'input'),

      Step.stateful(function (value, next, die) {
        Chain.asStep(value.container, [
          FocusTools.cSetActiveValue('chained.value')
        ])(value, next, die);
      }),

      Step.stateful(function (value, next, die) {
        Chain.asStep(value.container, [
          FocusTools.cGetActiveValue,
          Assertions.cAssertEq('Checking the value of input after set by chaining APIs', 'chained.value')
        ])(value, next, die);
      }),

      Step.stateful(function (value, next, die) {
        Chain.asStep(doc, [
          FocusTools.cGetFocused,
          Assertions.cAssertDomEq('Checking that focused element is the input', value.input)
        ])(value, next, die);
      }),

      DomContainers.mTeardown

    ], function () { success(); }, failure);
  }
);