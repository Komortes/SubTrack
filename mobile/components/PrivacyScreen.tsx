import { Feather } from "@expo/vector-icons";
import { Modal, View } from "react-native";

// Solid cover shown while the app is backgrounded/inactive, so subscription
// and payment data isn't visible in the OS app switcher/task preview between
// backgrounding and the LockScreen mounting on the next foreground.
export function PrivacyScreen({ visible }: { visible: boolean }) {
  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-bg">
        <View className="h-20 w-20 items-center justify-center rounded-3xl border border-border bg-surface">
          <Feather name="lock" size={36} color="#a3a3a3" />
        </View>
      </View>
    </Modal>
  );
}
