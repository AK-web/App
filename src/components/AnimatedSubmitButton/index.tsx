import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import Animated, {Keyframe, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import Button from '@components/Button';
import * as Expensicons from '@components/Icon/Expensicons';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';

type AnimatedSubmitButtonProps = {
    success: boolean | undefined;
    text: string;
    onPress: () => void;
    isSubmittingAnimationRunning: boolean;
    onAnimationFinish: () => void;
    shouldAddTopMargin?: boolean;
    wrapperStyle?: StyleProp<ViewStyle>;
};

function AnimatedSubmitButton({success, text, onPress, isSubmittingAnimationRunning, onAnimationFinish, shouldAddTopMargin = false, wrapperStyle}: AnimatedSubmitButtonProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const isAnimationRunning = isSubmittingAnimationRunning;
    const buttonDuration = isSubmittingAnimationRunning ? CONST.ANIMATION_SUBMIT_DURATION : CONST.ANIMATION_THUMBS_UP_DURATION;
    const gap = styles.expenseAndReportPreviewTextButtonContainer.gap;
    const buttonMarginTop = useSharedValue<number>(gap);
    const height = useSharedValue<number>(variables.componentSizeNormal);
    const [canShow, setCanShow] = useState(true);
    const [minWidth, setMinWidth] = useState<number>(0);
    const [isShowingLoading, setIsShowingLoading] = useState(false);
    const viewRef = useRef<HTMLElement | null>(null);

    const containerStyles = useAnimatedStyle(() => ({
        height: height.get(),
        justifyContent: 'center',
        ...(shouldAddTopMargin && {marginTop: buttonMarginTop.get()}),
    }));

    const stretchOutY = useCallback(() => {
        'worklet';

        if (shouldAddTopMargin) {
            buttonMarginTop.set(withTiming(canShow ? gap : 0, {duration: buttonDuration}));
        }
        if (canShow) {
            runOnJS(onAnimationFinish)();
            return;
        }
        height.set(withTiming(0, {duration: buttonDuration}, () => runOnJS(onAnimationFinish)()));
    }, [buttonDuration, buttonMarginTop, gap, height, onAnimationFinish, shouldAddTopMargin, canShow]);

    const buttonAnimation = useMemo(
        () =>
            new Keyframe({
                from: {
                    opacity: 1,
                    transform: [{scale: 1}],
                },
                to: {
                    opacity: 0,
                    transform: [{scale: 0}],
                },
            })
                .duration(buttonDuration)
                .withCallback(stretchOutY),
        [buttonDuration, stretchOutY],
    );
    let icon;
    if (isAnimationRunning) {
        icon = Expensicons.Send;
    }

    useEffect(() => {
        if (!isAnimationRunning) {
            setMinWidth(0);
            setCanShow(true);
            setIsShowingLoading(false);
            height.set(variables.componentSizeNormal);
            buttonMarginTop.set(shouldAddTopMargin ? gap : 0);
            return;
        }

        setMinWidth(viewRef.current?.getBoundingClientRect?.().width ?? 0);
        setIsShowingLoading(true);

        const timer = setTimeout(() => {
            setIsShowingLoading(false);
        }, CONST.ANIMATION_SUBMIT_LOADING_STATE_DURATION);

        return () => clearTimeout(timer);
    }, [buttonMarginTop, gap, height, isAnimationRunning, shouldAddTopMargin]);

    useEffect(() => {
        if (!isAnimationRunning || isShowingLoading) {
            return;
        }

        const timer = setTimeout(() => setCanShow(false), CONST.ANIMATION_SUBMIT_SUBMITTED_STATE_VISIBLE_DURATION);

        return () => clearTimeout(timer);
    }, [isAnimationRunning, isShowingLoading]);

    // eslint-disable-next-line react-compiler/react-compiler
    const showLoading = isShowingLoading || (!viewRef.current && isAnimationRunning);

    return (
        <Animated.View style={[containerStyles, wrapperStyle, {minWidth}]}>
            {isAnimationRunning && canShow && (
                <Animated.View
                    ref={(el) => {
                        viewRef.current = el as HTMLElement | null;
                    }}
                    exiting={buttonAnimation}
                >
                    <Button
                        success={success}
                        text={translate('common.submitted')}
                        isLoading={showLoading}
                        icon={!showLoading ? icon : undefined}
                    />
                </Animated.View>
            )}
            {!isAnimationRunning && (
                <Button
                    success={success}
                    text={text}
                    onPress={onPress}
                    icon={icon}
                />
            )}
        </Animated.View>
    );
}

AnimatedSubmitButton.displayName = 'AnimatedSubmitButton';

export default AnimatedSubmitButton;
