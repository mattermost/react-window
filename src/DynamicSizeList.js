// @flow

import { createElement } from 'react';

import createListComponent, { defaultItemKey } from './createListComponent';
import ItemMeasurer from './ItemMeasurer';

import type { Props, ScrollToAlign } from './createListComponent';

const DEFAULT_ESTIMATED_ITEM_SIZE = 50;

type DynanmicProps = {|
  estimatedItemSize: number,
  ...Props<any>,
|};

export type HandleNewMeasurements = (
  key: number,
  newSize: number,
  isFirstMeasureAfterMounting: boolean
) => void;

type ItemMetadata = {|
  offset: number,
  size: number,
|};
type InstanceProps = {|
  estimatedItemSize: number,
  instance: any,
  itemOffsetMap: { [index: number]: number },
  itemSizeMap: { [index: number]: number },
  totalMeasuredSize: number,
  oldDataIds: { [index: number]: number },
|};

const getItemMetadata = (
  props: Props<any>,
  index: number,
  instanceProps: InstanceProps
): ItemMetadata => {
  const { instance, itemOffsetMap, itemSizeMap } = instanceProps;
  const { itemData } = instance.props;
  // If the specified item has not yet been measured,
  // Just return an estimated size for now.
  if (!itemSizeMap[itemData[index]]) {
    return {
      offset: 0,
      size: 0,
    };
  }

  let offset = itemOffsetMap[itemData[index]] || 0;
  let size = itemSizeMap[itemData[index]] || 0;

  return { offset, size };
};

const generateOffsetMeasurements = (props, index, instanceProps) => {
  const { instance, itemOffsetMap, itemSizeMap } = instanceProps;
  const { itemData, itemCount } = instance.props;
  instanceProps.totalMeasuredSize = itemSizeMap[itemData[0]] || 0;
  if (index === 0) {
    itemOffsetMap[itemData[0]] = 0;
    delete instance._itemStyleCache[itemData[0]];
  }

  for (let i = 1; i < itemCount; i++) {
    const prevOffset = itemOffsetMap[itemData[i - 1]] || 0;

    // In some browsers (e.g. Firefox) fast scrolling may skip rows.
    // In this case, our assumptions about last measured indices may be incorrect.
    // Handle this edge case to prevent NaN values from breaking styles.
    // Slow scrolling back over these skipped rows will adjust their sizes.
    const prevSize = itemSizeMap[itemData[i - 1]] || 0;

    itemOffsetMap[itemData[i]] = prevOffset + prevSize;
    instanceProps.totalMeasuredSize += itemSizeMap[itemData[i]] || 0;
    // Reset cached style to clear stale position.
    delete instance._itemStyleCache[itemData[i]];
  }
};

const findNearestItemBinarySearch = (
  props: Props<any>,
  instanceProps: InstanceProps,
  high: number,
  low: number,
  offset: number
): number => {
  while (low < high) {
    const offsetNew = instanceProps.totalMeasuredSize - offset - props.height;
    const middle = low + Math.floor((high - low) / 2);
    const currentOffset = getItemMetadata(props, middle, instanceProps).offset;

    if (!currentOffset) {
      return low;
    } else if (currentOffset === offsetNew) {
      return middle;
    } else if (currentOffset < offsetNew) {
      low = middle + 1;
    } else if (currentOffset > offsetNew) {
      high = middle - 1;
    }
  }
  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

const getEstimatedTotalSize = (
  { itemCount }: Props<any>,
  { itemSizeMap, estimatedItemSize, totalMeasuredSize }: InstanceProps
) => totalMeasuredSize;

const DynamicSizeList = createListComponent({
  getItemOffset: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): number => getItemMetadata(props, index, instanceProps).offset,

  getItemSize: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): ?number => {
    // Do not hard-code item dimensions.
    // We don't know them initially.
    // Even once we do, changes in item content or list size should reflow.
    return undefined;
  },

  getEstimatedTotalSize,

  getOffsetForIndexAndAlignment: (
    props: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, height, width } = props;

    const size = (((direction === 'horizontal' ? width : height): any): number);
    const itemMetadata = getItemMetadata(props, index, instanceProps);

    // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);

    const maxOffset = Math.max(
      0,
      estimatedTotalSize - (size + itemMetadata.offset)
    );
    const minOffset = Math.max(
      0,
      estimatedTotalSize - itemMetadata.offset - (itemMetadata.size || 0)
    );

    switch (align) {
      case 'start':
        return minOffset;
      case 'end':
        return maxOffset;
      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);
      case 'auto':
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return estimatedTotalSize - (scrollOffset + height);
        } else if (scrollOffset - minOffset < maxOffset - scrollOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
    }
  },

  getStartIndexForOffset: (
    props: Props<any>,
    offset: number,
    instanceProps: InstanceProps
  ): number => {
    const { totalMeasuredSize } = instanceProps;
    const { itemCount } = props;

    // If we've already positioned and measured past this point,
    // Use a binary search to find the closets cell.
    if (offset <= totalMeasuredSize) {
      return findNearestItemBinarySearch(
        props,
        instanceProps,
        itemCount,
        0,
        offset
      );
    }

    // Otherwise render a new batch of items starting from where 0.
    return 0;
  },

  getStopIndexForStartIndex: (
    props: Props<any>,
    startIndex: number,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { itemCount } = props;

    let stopIndex = startIndex;
    const maxOffset = instanceProps.totalMeasuredSize - scrollOffset;
    const itemMetadata = getItemMetadata(props, stopIndex, instanceProps);
    let offset = itemMetadata.offset + (itemMetadata.size || 0);
    let closestOffsetIndex = 0;
    let previousOffset = 0;
    while (stopIndex < itemCount && offset <= maxOffset) {
      const itemMetadata = getItemMetadata(props, stopIndex, instanceProps);
      offset = itemMetadata.offset + itemMetadata.size;
      if (offset > previousOffset) {
        closestOffsetIndex = stopIndex;
      } else if (itemMetadata.offset === 0 && stopIndex !== 0) {
        return --stopIndex;
      }
      previousOffset = offset;
      stopIndex++;
    }

    if (stopIndex >= itemCount) {
      return closestOffsetIndex;
    }

    return stopIndex;
  },

  initInstanceProps(props: Props<any>, instance: any): InstanceProps {
    const { estimatedItemSize } = ((props: any): DynanmicProps);

    const instanceProps = {
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE,
      instance,
      itemOffsetMap: {},
      itemSizeMap: {},
      totalMeasuredSize: 0,
      atBottom: true,
    };

    let mountingCorrections = 0;
    let unMountingCorrections = 0;
    let correctedInstances = 0;
    let correctionFrame;
    const handleNewMeasurements: HandleNewMeasurements = (
      key: number,
      newSize: number,
      isFirstMeasureAfterMounting: boolean
    ) => {
      const { itemSizeMap } = instanceProps;
      const { itemData } = instance.props;
      let delta = 0;
      const index = itemData.findIndex(item => item === key);
      // In some browsers (e.g. Firefox) fast scrolling may skip rows.
      // In this case, our assumptions about last measured indices may be incorrect.
      // Handle this edge case to prevent NaN values from breaking styles.
      // Slow scrolling back over these skipped rows will adjust their sizes.
      const oldSize = itemSizeMap[key] || 0;
      if (oldSize === newSize) {
        return;
      }

      delta += newSize - oldSize;
      itemSizeMap[key] = newSize;

      if (!instance.state.scrolledToInitIndex) {
        generateOffsetMeasurements(props, index, instanceProps);
        instance.forceUpdate();
        return;
      }
      const element = ((instance._outerRef: any): HTMLDivElement);

      if (
        instance.state.scrollOffset + instance.props.height >=
        element.scrollHeight - 10
      ) {
        generateOffsetMeasurements(props, index, instanceProps);
        instance.forceUpdate();
        instance.scrollToItem(0, 'end');
        return;
      }

      const [, , , visibleStopIndex] = instance._getRangeToRender(
        element.scrollTop
      );

      generateOffsetMeasurements(props, index, instanceProps);

      if (index < visibleStopIndex - 1) {
        instance.forceUpdate();
        return;
      }

      instance._scrollCorrectionInProgress = true;

      instance.setState(
        prevState => {
          let deltaValue;
          if (mountingCorrections === 0 && unMountingCorrections === 0) {
            deltaValue = delta;
          } else {
            deltaValue = prevState.scrollDelta + delta;
          }
          mountingCorrections++;
          const newOffset = prevState.scrollOffset + delta;
          return {
            scrollOffset: newOffset,
            scrollDelta: deltaValue,
          };
        },
        () => {
          // $FlowFixMe Property scrollBy is missing in HTMLDivElement
          correctedInstances++;
          if (mountingCorrections === correctedInstances) {
            if (mountingCorrections === 1) {
              correctScroll();
            } else {
              if (correctionFrame) {
                window.cancelAnimationFrame(correctionFrame);
              }
              correctionFrame = window.requestAnimationFrame(correctScroll);
            }
          }
        }
      );
    };

    const correctScroll = () => {
      const { scrollOffset, scrollDelta } = instance.state;
      const { direction } = instance.props;
      const element = ((instance._outerRef: any): HTMLDivElement);
      if (element) {
        if (typeof element.scrollBy === 'function') {
          if (scrollDelta !== 0) {
            const x = direction === 'horizontal' ? scrollDelta : 0;
            const y = direction === 'horizontal' ? 0 : scrollDelta;
            element.scrollBy(x, y);
          }
        } else if (direction === 'horizontal') {
          element.scrollLeft = scrollOffset;
        } else {
          element.scrollTop = scrollOffset;
        }
        instance._scrollCorrectionInProgress = false;
        correctedInstances = 0;
        mountingCorrections = 0;
      }
    };

    instance._dataChange = () => {
      if (instanceProps.totalMeasuredSize < instance.props.height) {
        instance.props.canLoadMorePosts();
      }
    };

    instance._heightChange = (prevHeight, prevOffset) => {
      if (prevOffset + prevHeight >= instanceProps.totalMeasuredSize - 10) {
        instance.scrollToItem(0, 'end');
        return;
      }
    };

    instance._commitHook = () => {
      if (
        !instance.state.scrolledToInitIndex &&
        Object.keys(instanceProps.itemOffsetMap).length
      ) {
        const { index, position } = instance.props.initScrollToIndex();
        instance.scrollToItem(index, position);
        instance.setState({
          scrolledToInitIndex: true,
        });
      }
    };

    instance._handleNewMeasurements = handleNewMeasurements;

    const onItemRowUnmount = (itemId, index) => {
      const { props } = instance;
      if (props.itemData[index] === itemId) {
        return;
      }
      const doesItemExist = props.itemData.includes(itemId);
      if (!doesItemExist) {
        let delta = instanceProps.itemSizeMap[itemId];
        delete instanceProps.itemSizeMap[itemId];
        delete instanceProps.itemOffsetMap[itemId];
        const element = ((instance._outerRef: any): HTMLDivElement);

        const [, , , visibleStopIndex] = instance._getRangeToRender(
          element.scrollTop
        );

        if (
          instance.state.scrollOffset + instance.props.height >=
          instanceProps.totalMeasuredSize - 10
        ) {
          generateOffsetMeasurements(props, index, instanceProps);
          instance.scrollToItem(0, 'end');
          instance.forceUpdate();
          return;
        }
        generateOffsetMeasurements(props, index, instanceProps);

        if (index < visibleStopIndex) {
          instance.forceUpdate();
          return;
        }

        instance.setState(
          prevState => {
            let DeltaValue = 0;
            if (unMountingCorrections === 0 && mountingCorrections === 0) {
              DeltaValue = -delta;
            } else {
              DeltaValue = prevState.scrollDelta - delta;
            }
            const newOffset = prevState.scrollOffset + DeltaValue;
            unMountingCorrections++;
            return {
              scrollOffset: newOffset,
              scrollDelta: DeltaValue,
            };
          },
          () => {
            if (mountingCorrections === 0) {
              const { scrollOffset, scrollDelta } = instance.state;
              const { direction } = instance.props;
              const element = ((instance._outerRef: any): HTMLDivElement);
              if (element) {
                if (typeof element.scrollBy === 'function') {
                  if (scrollDelta !== 0) {
                    const x = direction === 'horizontal' ? scrollDelta : 0;
                    const y = direction === 'horizontal' ? 0 : scrollDelta;
                    element.scrollBy(x, y);
                  }
                } else if (direction === 'horizontal') {
                  element.scrollLeft = scrollOffset;
                } else {
                  element.scrollTop = scrollOffset;
                }
              }
            }
            unMountingCorrections--;
          }
        );
      }
    };

    // Override the item-rendering process to wrap items with ItemMeasurer.
    // This keep the external API simpler.
    instance._renderItems = () => {
      const {
        children,
        direction,
        itemCount,
        itemData,
        itemKey = defaultItemKey,
        useIsScrolling,
        width,
        skipResizeClass,
      } = instance.props;
      const { isScrolling } = instance.state;

      const [startIndex, stopIndex] = instance._getRangeToRender();
      const items = [];
      if (itemCount > 0) {
        for (let index = startIndex; index <= stopIndex; index++) {
          const { size } = getItemMetadata(
            instance.props,
            index,
            instanceProps
          );

          // It's important to read style after fetching item metadata.
          // getItemMetadata() will clear stale styles.
          const style = instance._getItemStyle(index);

          const item = createElement(children, {
            data: itemData,
            itemId: itemData[index],
            isScrolling: useIsScrolling ? isScrolling : undefined,
          });

          // Always wrap children in a ItemMeasurer to detect changes in size.
          items.push(
            createElement(ItemMeasurer, {
              direction,
              handleNewMeasurements,
              index,
              item,
              key: itemKey(index),
              size,
              itemId: itemKey(index),
              onUnmount: onItemRowUnmount,
              width,
              skipResizeClass,
              style,
            })
          );
        }
      }
      return items;
    };
    return instanceProps;
  },

  shouldResetStyleCacheOnItemSizeChange: false,

  validateProps: ({ itemSize }: Props<any>): void => {
    if (process.env.NODE_ENV !== 'production') {
      if (itemSize !== undefined) {
        throw Error('An unexpected "itemSize" prop has been provided.');
      }
    }
  },
});

export default DynamicSizeList;
