	}
	const chatbotService = new ChatbotService(
		import.meta.env?.VITE_NODE_BASE_URL as string|| '',
		import.meta.env?.VITE_84LUMBER_ELLM_USERNAME as string||'',
		import.meta.env?.VITE_84LUMBER_ELLM_PASSWORD as string||''
)
const testToggleConsultativeMode = async () => {
		try {
				const chatBotId = chatbotIdOfAssistant??'';
				const name = assistantName;
				const organizationName =  import.m
