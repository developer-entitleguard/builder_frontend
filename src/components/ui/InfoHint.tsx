import InfoCircleOutlined from "@ant-design/icons/es/icons/InfoCircleOutlined";
import { Tooltip } from "antd";

/**
 * Small inline help hint: a truncated line of guidance with the full text on
 * hover. Shared across the builder portal so help copy reads consistently.
 * (Promoted from a local copy in ItemsManagement.)
 */
const InfoHint = ({ text, maxChars = 25 }: { text: string; maxChars?: number }) => {
  const shortText = text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
  return (
    <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
      <Tooltip title={text}>
        <InfoCircleOutlined className="shrink-0 text-sm" />
      </Tooltip>
      <Tooltip title={text}>
        <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {shortText}
        </span>
      </Tooltip>
    </div>
  );
};

export default InfoHint;
