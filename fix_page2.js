const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const startTarget = '  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {';
const endTarget = '  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");\n';

const startIndex = content.indexOf(startTarget);
let endIndex = content.indexOf(endTarget);

if (startIndex !== -1 && endIndex !== -1) {
  endIndex += endTarget.length;
  const beforeStr = content.slice(0, startIndex);
  const afterStr = content.slice(endIndex);

  const useLiveChatCode = `
  // Live Chat Admin State — extracted to useLiveChat hook
  const {
    adminLiveChatMessages,
    setAdminLiveChatMessages,
    adminLiveInput,
    setAdminLiveInput,
    activeSessionId,
    setActiveSessionId,
    chatSessionsList,
    setChatSessionsList,
    lastLiveChatMsg,
    isLiveChatSessionEnded,
    activeSessionMessages,
    handleAdminSendLiveChat,
    handleAdminEndLiveChat,
    handleAdminClearLiveChat,
  } = useLiveChat(triggerToast);

`;

  content = beforeStr + useLiveChatCode + afterStr;
  fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
  console.log("Replaced duplicated timesale block and inserted useLiveChat");
} else {
  console.log("Could not find start or end target for timesale block");
  process.exit(1);
}
