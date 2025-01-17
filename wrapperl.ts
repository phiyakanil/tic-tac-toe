import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import {useAuth} from '@/hooks/use-auth';
import {IRepoDetails} from '@/redux/slices/project-analysis.slice';
import {NEW_TOAST_MESSAGES_STATUS_MAP} from '@/shared/constants/constants';
import {useTypedSelector} from '@/shared/hooks';
import {assignCsToProjectService, createModuleBranchProjectAnalyser, createProjectReportService, getAiBasedDescription, GetAIBasedDescriptionInterface, getBranches, GetBranchesProps, ICreateModuleBranchPayload, ILanguageRequestEmailPayload, IRepoConfig, IRepoData, projectDeletion, projectIngestionRegenService, projectIngestionRegenServiceRequest, projectIngestionRequestThroughEmail, shareProjectAnalysisThroughMail, updateEditedSummaryService, ISyncRepoData, operationType} from '@/shared/services/project-anlaysis.api.service';
import { checkForRepoSupport, IReportDependencyBugProps, reportDependencyBug, sendLanguageRequest } from '@/shared/services/shared.api.service';
import { fetchSyncStatus, notifyViaEmailSync, SyncProjectRepoData } from '@/shared/services/sync.api.service';
import { approveProjectAnalysisRequest } from '@/shared/services/project-analyser/dashboard.api.service';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { customToasts } from '@/shared/components/molecules/toasts';

export interface ApiError extends Error {
	request: {
		status: number;
	};
}

// Assuming you're using react-toastify for notifications
const MESSAGES_CONSTANTS = {
	ERROR_CODING_STANDARS_LINKING: 'Something went wrong while integrating the Coding standards provided',
	SUCCESS_CODING_STANDARS_LINKING: 'Successfully linked the Coding standards provided'
};
export const useSubmitFeedback = (view: 'dashboard' | 'feature', onClose: () => void = () => {}, onSubmitSuccessCallback: (value: string) => void = () => {}) => {
	return useMutation({
		mutationFn: async ({taskId, userId, editedSummary}: {taskId: string; userId: string; editedSummary: string}) => {
			await updateEditedSummaryService({
				editedSummary,
				taskId,
				userId,
				view
			});
			return {editedSummary}; // Pass editedSummary to the onSuccess callback
		},
		onSuccess: ({editedSummary}) => {
			onClose();
			onSubmitSuccessCallback(editedSummary);
		},
		onError: (error) => {
			onClose();
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];

			toast.error(`${description}`);
		}
	});
};

export const useReloadProject = (onClose: () => void = () => {}, onSubmitSuccessCallback: (value: {taskId: string; userId: string}) => void = () => {}) => {
	const userSession = useTypedSelector((state) => state.auth);

	return useMutation({
		mutationFn: async ({taskId, userId, projectName, reposList, zipData, batchSize}: {taskId: string; userId: string; projectName?: string; reposList?: Array<string>; zipData?: Blob; batchSize: number}) => {
			const formattedData = reposList?.map((item) => {
				const [linkPart, branchPart] = item.split('branch:');
				const url = linkPart.slice(5);
				const branch_name = branchPart;
				return {
					url: url,
					branch_name: branch_name,
					access_token: userSession.oathProviderToken.accessToken
				};
			});
			return projectIngestionRegenService({
				reposList: formattedData,
				projectName,
				taskId,
				batchSize,
				userId,
				zipData,
				regenerate: true,
				gitAccessToken: userSession?.oathProviderToken?.accessToken || '',
				egptToken: userSession?.accessToken || ''
			});
		},
		onSuccess: (data) => {
			toast.success(`Regeneration request submitted successfully! redirecting`, {});
			onClose();
			onSubmitSuccessCallback({
				taskId: data?.task_id || '',
				userId: data?.user_id || ''
			});
		},
		onError: (error) => {
			onClose();
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];

			toast.error(`${description}`);
		}
	});
};

export const useLinkSelectedCodingStandardsMutation = () => {
	const {accessToken} = useAuth();
	const {
		loadProjects: {tableLists: loadedReposList},
		projectName
	} = useTypedSelector((state) => state.projectAnalysis);

	const extractCodingStandardsData = (repos: IRepoDetails[]) => {
		return repos.map((repoData) => {
			const codingStandardsIds = repoData.codingStandardsPacks.flatMap((packData) => {
				const currentPackCodingStandardIds = packData.codingStandards.map((codingStandard) => codingStandard.id);
				return currentPackCodingStandardIds;
			});
			return {repoURl: repoData.link, codingStandardsIds};
		});
	};

	/**
	 * Assigns coding standards to repositories.
	 *
	 * @param selectedReposList - List of selected repositories.
	 * @returns A promise that resolves to the data returned from the assignCsToProjectService.
	 */
	const handleAssignCsToRepository = async (selectedReposList: IRepoDetails[]) => {
		const repoCodingStandards = extractCodingStandardsData(selectedReposList);
		const data = await Promise.all(
			repoCodingStandards
				.filter((repo) => repo.codingStandardsIds.length > 0)
				.map((repo) => {
					return assignCsToProjectService({
						project_name: projectName,
						repo_url: repo.repoURl,
						cs_id: repo.codingStandardsIds
					});
				})
		);
		return data;
	};

	return useMutation({
		mutationFn: async ({selectedIds}: {selectedIds: Array<string>}) => {
			// console.log(loadedReposList);
			const selectedReposList = loadedReposList.filter((repo) => selectedIds.includes(repo.id));
			const selectedRepoUrls = selectedReposList.map((repo) => repo.link);
			await createProjectReportService({
				github_repo_link: selectedRepoUrls,
				project_name: projectName,
				token: accessToken ?? ''
			});
			const data = await handleAssignCsToRepository(selectedReposList);
			return data;
		},
		onSuccess: (data) => {
			toast.success(MESSAGES_CONSTANTS.SUCCESS_CODING_STANDARS_LINKING,{
				position:'bottom-right'
			});
		},
		onError: (error) => {
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];

			toast.error(`${description}`);
		}
	});
};
export const useCreateModuleBranch = () => {
	const gitAccessToken = useTypedSelector((state) => state.auth?.oathProviderToken?.accessToken);

	return useMutation({
		mutationFn: async (payload: ICreateModuleBranchPayload) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			await createModuleBranchProjectAnalyser(payload, gitAccessToken ?? '');
		},
		onSuccess: () => {
			toast.success('Successfully created Module Branch');
		},
		onError: (error) => {
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`${description}`);
		}
	});
};

export const useProjectDeletion = () => {
	return useMutation({
		mutationFn: async ({userId, taskId, repoData}: {userId: string; taskId: string; repoData: IRepoData[]}) => {
			const response = await projectDeletion(userId, taskId, repoData);
			return response.message;
		},
		onSuccess: () => {
			toast.success('Successfully deleted the project.');
		},
		onError: (error) => {
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];

			toast.error(`${description}`);
		}
	});
  };

  export const useShareProjectAnalysisThroughEmail=()=>{
	return useMutation({
		mutationFn:async ({userId,taskId,emailIds,projectName,userName, validity, accessType}:{userId:string;taskId:string;emailIds:Array<string>;projectName:string;userName:string, validity: string, accessType: string})=>{
			const response=await shareProjectAnalysisThroughMail(userId,taskId,emailIds,projectName,userName, accessType, validity);
			
			return response;
		},
		onSuccess:()=>{
			toast.success('Project Analysis shared successfully!')
		},
		onError:(error)=>{
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			
			toast.error(`${description}`);
		}
		
	})
  }
  
export const useGetAiBasedDescription = () => {
	return useMutation({
		mutationFn: async (payload:GetAIBasedDescriptionInterface) => {
			const response = await getAiBasedDescription(payload);
			return response?.readme_content
		},
		onError:(error)=>{
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`${description}`);
		}
	})
}

export const useSyncProjectRepoData=()=>{

	const [currentURLsearchParameters] = useSearchParams();
	const taskId = currentURLsearchParameters.get('taskId') ;
	const userId = useTypedSelector((state) => state.auth.user?._id) ;
	const gitToken = useTypedSelector((state) => state.auth.oathProviderToken.accessToken);
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload:Pick<ISyncRepoData,'sync_type'>) => {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is missing or empty');
			  }
			
			  if (!userId || userId.trim() === '') {
				throw new Error('User ID is missing or empty');
			  }			
			const response = await SyncProjectRepoData({...payload,git_access_token:gitToken,task_id:taskId,user_id:userId});
			return response
		},
		onSuccess:async (data)=>{
		
			toast.success('Project data sync request submitted successfully!',{
				duration:3000
			})
			await queryClient.invalidateQueries({ queryKey: ['PROJECT-INGESATION', 'GET-SUMMARY', taskId] });
		},
		onError:(error)=>{
			if(axios.isAxiosError(error)){
				if(error?.status===304){
					customToasts.info({
						message:'Your project analysis is already up to date',
						options:{
							duration:10_000,
						}
					})
				} else if (error?.status === 409) {
					customToasts.info({
						message:'Analysis In Progress',
						options:{
							duration:10_000
						}
					})
				}
			}
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`${description}`,{
				duration:3000
			});
		}
	})
}

export const useNotifyViaEmailSync=()=>{

	const [currentURLsearchParameters] = useSearchParams();
	const taskId = currentURLsearchParameters.get('taskId') ;
	const userId = useTypedSelector((state) => state.auth?.user?._id) ;
	const gitToken = useTypedSelector((state) => state.auth.oathProviderToken.accessToken);
	const emailId = useTypedSelector((state) => state.auth.user?.email);

	return useMutation({
		mutationFn: async ({taskId}:{
			taskId:string,
			userId?:string
		}) => {
			console.log('mutation-called:',emailId,userId,taskId)
			
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is missing or empty');
			  }
			
			  if (!userId || userId.trim() === '') {
				throw new Error('User ID is missing or empty');
			  }			

			  if(!emailId || emailId.trim() === ''){
				throw new Error('Email ID is missing or empty');
			  }

			const response = await notifyViaEmailSync({task_id:taskId,git_access_token:gitToken,user_id:userId,email_id:emailId});
			return response
		},
		onSuccess:()=>{
			// toast.success('We will notify you once the sync is completed!',{
			// 	duration:3000
			// })
		},
		onError:(error)=>{
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`${description}`);
		}
	})
}

export const useCheckForRepoSupport=()=>{
	const gitAccessToken=useTypedSelector((state)=>state.auth.oathProviderToken.accessToken)
	return useMutation({
		mutationFn:async(repos:IRepoConfig )=>{
			const response=await checkForRepoSupport(repos,gitAccessToken);
			return response;
		},
		onSuccess: () => {
			toast.success('Repository is supported!');
		},
		onError: (error) => {
			const apiError = error as ApiError;
			const { description } = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`Error checking repo support: ${description}`);
		},
	})
}

export const useSendLanguageRequest=()=>{
	return useMutation({
		mutationFn:async(payload:ILanguageRequestEmailPayload)=>{
			const response=await sendLanguageRequest(payload);
			return response;
		},
		onSuccess: () => {
			toast.success('Email sent successfully');
		},
		onError: (error) => {
			const apiError = error as ApiError;
			const { description } = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`Error while sending email: ${description}`);
		},
	})
}  

export const useReportDependencyBug=()=>{
	return useMutation({
		mutationFn: async (payload:IReportDependencyBugProps)=>{
			console.log('payload',payload);
			const response = await  reportDependencyBug(payload);
			return response;
		},
		onSuccess:()=>{
			toast.success('Issue has been reported successfully.',{
				position:'bottom-right'
			});
		},
		onError:(error)=>{
			const apiError = error as ApiError;
			const { description } = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`Error while sending email: ${description}`);
		}
	})
}


export const useGetBranchesMutation = () => {
	return useMutation({
		mutationFn: async (payload:GetBranchesProps) => {
			console.log("payload",payload)
			const response = await getBranches(payload);
			return response;
		}
		,
		onError:(error)=>{
			console.log("error",error)
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`${description}`);
		}
	})
}
//this is for request fo
export const useReloadProjectRequest = (onClose: () => void = () => {}, onSubmitSuccessCallback: (value: {taskId: string; userId: string, user_role?: 'approver' | 'normal' | 'null';
  approvers_data?: {project_name: string; email: string}[],approval_required:boolean}) => void = () => {}) => {
	const userSession = useTypedSelector((state) => state.auth);

	const userFirstName=useTypedSelector((state)=>state.auth.user?.firstname)??"";
  const userLastName=useTypedSelector((state)=>state.auth.user?.lastname)??"";
  const userEmail=useTypedSelector((state)=>state.auth.user?.email)??"";

	return useMutation({
		mutationFn: async ({taskId, userId, projectName, reposList, zipData, batchSize}: {taskId: string; userId: string; projectName?: string; reposList?: Array<string>; zipData?: Blob; batchSize: number}) => {
			const formattedData = reposList?.map((item) => {
				const [linkPart, branchPart] = item.split('branch:');
				const url = linkPart.slice(5);
				const branch_name = branchPart;
				return {
					url: url,
					branch_name: branch_name,
					access_token: userSession.oathProviderToken.accessToken
				};
			});
			return projectIngestionRegenServiceRequest({
				reposList: formattedData,
				projectName,
				taskId,
				batchSize,
				userId,
				zipData,
				regenerate: true,
				gitAccessToken: userSession?.oathProviderToken?.accessToken || '',
				egptToken: userSession?.accessToken || '',
				user_name:userFirstName+" "+userLastName,
				email:userEmail
			});
		},
		onSuccess: (data) => {
			if(data.approval_required){
			toast('Re-analysis limit reached. Please request approval.')
			}
			else{
			toast.success(`Re-analysis request submitted successfully! redirecting`, {});
			}
			onClose();
			onSubmitSuccessCallback({
				taskId: data?.task_id || '',
				userId: data?.user_id || '',
				user_role: data?.user_role,
        approvers_data: data?.approvers_data,
				approval_required:data?.approval_required as boolean
			});
		},
		onError: (error) => {
			onClose();
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];

			toast.error(`${description}`);
		}
	});
};

export const useApproveProjectAnalysisRequest=()=>{
	const userSession = useTypedSelector((state) => state.auth);

	return useMutation({
	mutationFn:async({taskId, userId,approveStatus,operationType}: {taskId: string, userId: string,approveStatus:boolean,operationType:operationType})=>{
			await approveProjectAnalysisRequest({taskId, userId, approved: approveStatus, approverUserId: userSession.user?._id ?? '', egptAccessToken: userSession.accessToken ?? '', gitAccessToken: userSession.oathProviderToken.accessToken ?? '',operationType:operationType??"analyse"})
	},
	onSuccess:(_,variables)=>{
		if(variables.approveStatus){
			toast.success('Project Analysis request approved successfully!')
		}
		else{
			toast('Project Analysis request rejected!')
		}
	},
	onError:(error)=>{
		const apiError = error as ApiError;
		const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
		toast.error(`${description}`);
	}
	})
}

export const useRequestForProjectAnalysisThroughMail = () => {
	const navigate=useNavigate();
	return useMutation({
		mutationFn:async({taskId,userId,approverMail,operationType}:{taskId:string,userId:string,approverMail:string,operationType:operationType})=>{
			await projectIngestionRequestThroughEmail({taskId,userId,approverMail,operationType});
		},
		onSuccess:()=>{
			toast.success('Request for project analysis sent successfully!')
			navigate('/user-mode/project-analysis')
		},
		onError:(error)=>{
			const apiError = error as ApiError;
			const {description} = NEW_TOAST_MESSAGES_STATUS_MAP[apiError.request.status];
			toast.error(`${description}`);
		}	
			
	}
)

}


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
		return;
	  }
	  setTaskId(taskId);
	  setIsPolling(true);
	};
  
	return { ...queryData,startPolling, stopPolling,isPolling };
  };
  
