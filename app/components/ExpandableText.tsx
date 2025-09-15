import React, { useState } from "react";
import { Text } from "react-native";

interface Props {
  content: string;
}

const ExpandableText: React.FC<Props> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  const isLongText = content.length > 80;
  const preview = content.slice(0, 30);

  return (
    <Text
      style={{
        fontFamily: "regular",
        fontSize: 14,
        color: "black",
        marginBottom: 4,
        textAlign: "right",
      }}
    >
      {expanded || !isLongText ? (
        <Text onPress={() => setExpanded(false)}>
          {content}
        </Text>
      ) : (
        <>
          {preview}...
          <Text
            style={{ color: "#1D9BF0" }}
            onPress={() => setExpanded(true)}
          >
            عرض المزيد
          </Text>
        </>
      )}
    </Text>
  );
};

export default ExpandableText;
