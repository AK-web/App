import React from 'react';
import type {ActivityIndicatorProps, StyleProp, ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import useThemeStyles from '@hooks/useThemeStyles';
import ActivityIndicator from './ActivityIndicator';

type FullScreenLoadingIndicatorIconSize = ActivityIndicatorProps['size'];

type FullScreenLoadingIndicatorProps = {
    style?: StyleProp<ViewStyle>;
    iconSize?: FullScreenLoadingIndicatorIconSize;
    testID?: string;
};

function FullScreenLoadingIndicator({style, iconSize = 'large', testID = ''}: FullScreenLoadingIndicatorProps) {
    const styles = useThemeStyles();
    return (
        <View style={[StyleSheet.absoluteFillObject, styles.fullScreenLoading, style]}>
            <ActivityIndicator
                size={iconSize}
                testID={testID}
            />
        </View>
    );
}

FullScreenLoadingIndicator.displayName = 'FullScreenLoadingIndicator';

export default FullScreenLoadingIndicator;

export type {FullScreenLoadingIndicatorIconSize};
