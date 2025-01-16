t useSyncStatusPolling = () => {
	const [isPolling, setIsPolling] = useState(false);
	const [currentURLsearchParameters] = useSearchParams();
	const [taskId, setTaskId] = useState(currentURLsearchParameters.get('taskId') ?? '');
	const userId = currentURLsearchParameters.get('userId') 
  
	const queryData = useQuery({
	  queryKey: ['status', taskId, userId],
	  queryFn: async () => {
		if (!taskId || !userId) {
		  throw new Error('Task ID is missing or empty');
		}
		const data = await fetchSyncStatus(taskId, userId);
		return data;
	  },
	  enabled: isPolling && !!taskId,
	  refetchInterval: 10_000, // 10 seconds
	  refetchIntervalInBackground: true,
	});
	const stopPolling = () => { setIsPolling(false); };
