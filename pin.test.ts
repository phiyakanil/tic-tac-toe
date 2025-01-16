/* eslint-disable no-use-before-define */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Stack } from '@mui/material';

import { startChatStream, ChatbotService } from '@e-llm-studio/streaming-response';

import { ArrowDown, ArrowUp, Pause } from '@/assets/icons';
import { chatBotIcon, collapseContentIcon, expandContentIcon, whiteCloseSvg } from '@/assets/svg';
import { featureFlag } from '@/configurations/feature-flag.config';
import { ELLM_ORGANISATION_NAME, returnCustomPromptForGraphQLStream, sorryMessage } from '@/shared/constants/constants';
import { Button } from '@/shared/components/atomic-components/button';
import InfoBanner from '@/shared/components/molecules/info-banner.component';
import { TypographySmall } from '@/shared/components/shadcn-components/ui/typography.component';
import HorizontalLayout from '@/shared/components/templates/horizontal-layout';
import VerticalLayout from '@/shared/components/templates/vertical-layout';
import { getCurrentTimeStamp } from '@/shared/components/tree-directory-view/util.helper';
import { useTypedSelector } from '@/shared/hooks';
import useDebounce from '@/shared/hooks/useDebounce';
import { useScroll } from '@/shared/hooks';
import { getChatHistoryAPIService, resetChatHistoryService } from '@/shared/services/project-analyser/ellm/chat-assistant.history';
import { cn } from '@/shared/utils';
import { generateUUID } from '@/shared/utils/helper.util';

import { useAnalyserData } from '../../../context';
import { ChatMessageInterface } from '../interfaces';
import ChatBotMessageList from './chat-bot-message-list/chat-bot-message-list.component';

import styles from './chat-bot-window.module.css';
