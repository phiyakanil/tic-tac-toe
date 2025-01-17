
export const useSyncStatusPolling = () => {
	const [currentURLsearchParameters] = useSearchParams();
	const [taskId, setTaskId] = useState(currentURLsearchParameters.get('taskId') ?? '');
	const userId = currentURLsearchParameters.get('userId');
	const [isPolling, setIsPolling] = useState(false);
	const queryClient = useQueryClient();

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
  
	useEffect(() => {
		console.log('queryData?.data',queryData?.data)
	  if (queryData?.data?.status === 'Completed' || queryData?.data?.status === 'Failed') {
		console.log('invalidating queries',['PROJECT-INGESATION', 'GET-SUMMARY', taskId])
		void queryClient.invalidateQueries({ queryKey: ['PROJECT-INGESATION', 'GET-SUMMARY', taskId] })
		stopPolling();
	  }
	  if(queryData?.data?.status === 'Failed'){
		toast.error('Something went wrong while syncing please retry!',{
			duration:3000,
			position:'bottom-center'
		})
	  }
	}, [queryData]);
  
	useEffect(()=>{
		setIsPolling(false);
	},[])
	const startPolling = ({taskId}:{taskId:string}) => {
	  if (!taskId) {
		console.error('Cannot start polling: Task ID is missing or empty');
