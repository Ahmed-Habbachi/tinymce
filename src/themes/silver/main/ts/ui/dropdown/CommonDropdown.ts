/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import {
  AddEventsBehaviour,
  AlloyComponent,
  AlloyEvents,
  AlloyTriggers,
  Behaviour,
  CustomEvent,
  Dropdown as AlloyDropdown,
  Focusing,
  GuiFactory,
  Keying,
  Memento,
  Replacing,
  Representing,
  SimulatedEvent,
  SketchSpec,
  SugarEvent,
  TieredData,
  Unselecting,
} from '@ephox/alloy';
import { Types } from '@ephox/bridge';
import { Future, Id, Merger, Option, Arr } from '@ephox/katamari';
import { toolbarButtonEventOrder } from 'tinymce/themes/silver/ui/toolbar/button/ButtonEvents';

import { UiFactoryBackstageShared } from '../../backstage/Backstage';
import { renderLabel, renderIconFromPack } from '../button/ButtonSlices';
import * as Icons from '../icons/Icons';
import { componentRenderPipeline } from '../menus/item/build/CommonMenuItem';
import * as MenuParts from '../menus/menu/MenuParts';

export const updateMenuText = Id.generate('update-menu-text');

export interface UpdateMenuTextEvent extends CustomEvent {
  text: () => string;
}

export interface BasketballFoo {
  text: Option<string>;
  icon: Option<string>;
  tooltip: Option<string>;
  role: Option<string>;
  fetch: (callback: (tdata: TieredData) => void) => void;
  onAttach: (comp: AlloyComponent) => void;
  onDetach: (comp: AlloyComponent) => void;
  columns: Types.ColumnTypes;
  presets: Types.PresetTypes;
  classes: string[];
}
// TODO: Use renderCommonStructure here.
const renderCommonDropdown = (spec: BasketballFoo, prefix: string, sharedBackstage: UiFactoryBackstageShared): SketchSpec => {

  const optMemDisplayText = spec.text.map((text) => Memento.record(renderLabel(text, prefix, sharedBackstage.providers)));

  /*
   * The desired behaviour here is:
   *
   *   when left or right is pressed, and it isn't associated with expanding or
   *   collapsing a submenu, then it should navigate to the next menu item, and
   *   expand it (without highlighting any items in the expanded menu).
   *   It also needs to close the previous menu
   */
  const onLeftOrRightInMenu = (comp: AlloyComponent, se: SimulatedEvent<SugarEvent>) => {
    // The originating dropdown is stored on the sandbox itself.
    const dropdown: AlloyComponent = Representing.getValue(comp);

    // Focus the dropdown. Current workaround required to make flow recognise the current focus
    Focusing.focus(dropdown);
    AlloyTriggers.emitWith(dropdown, 'keydown', {
      raw: se.event().raw()
    });

    // Close the dropdown
    AlloyDropdown.close(dropdown);

    return Option.some(true);
  };

  const role = spec.role.fold(() => ({ }), (role) => ({ role }));

  const memDropdown = Memento.record(
    AlloyDropdown.sketch({
      ...role,
      dom: {
        tag: 'button',
        classes: [ prefix, `${prefix}--select` ].concat(Arr.map(spec.classes, (c) => `${prefix}--${c}`)),
        attributes: spec.tooltip.fold(
          () => ({}),
          (tooltip) => {
            const translatedTooltip = sharedBackstage.providers.translate(tooltip);
            return {
              'title': translatedTooltip, // TODO: tooltips AP-213
              'aria-label': translatedTooltip
            };
          }
        )
      },
      components: componentRenderPipeline([
        spec.icon.map((iconName) => renderIconFromPack(iconName, sharedBackstage.providers.icons)),
        optMemDisplayText.map((mem) => mem.asSpec()),
        Option.some({
          dom: {
            tag: 'div',
            classes: [ `${prefix}__select-chevron` ],
            innerHtml: Icons.get('chevron-down', sharedBackstage.providers.icons)
          }
        })
      ]),
      matchWidth: true,
      useMinWidth: true,

      // TODO: Not quite working. Can still get the button focused.
      dropdownBehaviours: Behaviour.derive([
        Unselecting.config({ }),
        Replacing.config({ }),
        AddEventsBehaviour.config('menubutton-update-display-text', [
          AlloyEvents.runOnAttached(spec.onAttach),
          AlloyEvents.runOnDetached(spec.onDetach),
          AlloyEvents.run<UpdateMenuTextEvent>(updateMenuText, (comp, se) => {
            optMemDisplayText.bind((mem) => mem.getOpt(comp)).each((displayText) => {
              Replacing.set(displayText, [ GuiFactory.text(sharedBackstage.providers.translate(se.event().text())) ] );
            });
          })
        ])
      ]),
      eventOrder: Merger.deepMerge(toolbarButtonEventOrder, {
        mousedown: [ 'focusing', 'alloy.base.behaviour', 'item-type-events', 'normal-dropdown-events' ]
      }),

      sandboxBehaviours: Behaviour.derive([
        Keying.config({
          mode: 'special',
          onLeft: onLeftOrRightInMenu,
          onRight: onLeftOrRightInMenu
        })
      ]),

      lazySink: sharedBackstage.getSink,

      toggleClass: `${prefix}--active`,

      parts: {
        // FIX: hasIcons
        menu: MenuParts.part(false, spec.columns, spec.presets)
      },

      fetch: () => {
        return Future.nu(spec.fetch);
      }
    })
  );

  return memDropdown.asSpec() as SketchSpec;
};

export {
  renderCommonDropdown
};