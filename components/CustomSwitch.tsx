import React, { useEffect, useState } from "react";
import { Animated, TouchableOpacity, View } from "react-native";

const CustomSwitch = ({
  selectionMode,
  roundCorner,
  option1,
  option2,
  onSelectSwitch,
  selectionColor,
  isDark = false,
}: {
  selectionMode: number;
  roundCorner: boolean;
  option1: string;
  option2: string;
  onSelectSwitch: (val: number) => void;
  selectionColor: string;
  isDark?: boolean;
}) => {
  const [themeAnim] = useState(() => new Animated.Value(isDark ? 1 : 0));

  const getSelectionMode = selectionMode;

  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const updatedSwitchData = (val: number) => {
    onSelectSwitch(val);
  };

  const borderColor = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [selectionColor, "#fff"],
  });
  const containerColor = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fff", "#353636"],
  });
  const activeColor = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [selectionColor, "#fff"],
  });
  const inactiveColor = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fff", "#353636"],
  });
  const activeTextColor = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fff", "#353636"],
  });
  const inactiveTextColor = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [selectionColor, "#fff"],
  });

  return (
    <View>
      <Animated.View
        style={{
          height: 44,
          width: 215,
          backgroundColor: containerColor,
          borderRadius: roundCorner ? 25 : 0,
          borderWidth: 1,
          borderColor,
          flexDirection: "row",
          justifyContent: "center",
          padding: 2,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => updatedSwitchData(1)}
          style={{ flex: 1 }}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor:
                getSelectionMode === 1 ? activeColor : inactiveColor,
              borderRadius: roundCorner ? 25 : 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Animated.Text
              style={{
                color:
                  getSelectionMode === 1 ? activeTextColor : inactiveTextColor,
              }}
            >
              {option1}
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => updatedSwitchData(2)}
          style={{ flex: 1 }}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor:
                getSelectionMode === 2 ? activeColor : inactiveColor,
              borderRadius: roundCorner ? 25 : 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Animated.Text
              style={{
                color:
                  getSelectionMode === 2 ? activeTextColor : inactiveTextColor,
              }}
            >
              {option2}
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
export default CustomSwitch;
