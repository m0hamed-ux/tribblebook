import theme from '@/assets/theme/styles'
import { CheckCircle, Info, Warning, XCircle } from 'phosphor-react-native'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type DialogButton = {
	text: string
	onPress?: () => void
	style?: 'default' | 'cancel' | 'destructive'
}

type DialogOptions = {
	title?: string
	message?: string
	type?: 'info' | 'error' | 'confirm' | 'success'
	buttons?: DialogButton[]
}

type DialogContextValue = {
	showDialog: (opts: DialogOptions) => Promise<number | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

// Simple service so we can route existing Alert.alert calls to our dialog
const dialogService = {
	_handler: null as null | ((opts: DialogOptions) => Promise<number | null>),
	_queue: [] as DialogOptions[],
	register(handler: (opts: DialogOptions) => Promise<number | null>) {
		this._handler = handler
		// flush queue
		while (this._queue.length > 0) {
			const o = this._queue.shift()!
			// fire-and-forget
			handler(o).catch(() => {})
		}
	},
	showFromAlertArgs(title?: string, message?: string, buttons?: any) {
		const opts: DialogOptions = {
			title: title as string | undefined,
			message: message as string | undefined,
			type: 'info',
			buttons: Array.isArray(buttons)
				? buttons.map((b: any) => ({ text: String(b?.text ?? 'حسناً'), onPress: b?.onPress, style: b?.style }))
				: undefined,
		}
		if (this._handler) {
			this._handler(opts).catch(() => {})
		} else {
			// queue until provider mounts
			this._queue.push(opts)
		}
	},
}

function useDialog() {
	const ctx = useContext(DialogContext)
	if (!ctx) throw new Error('useDialog must be used within DialogProvider')
	return ctx
}

export { dialogService, useDialog }

export function DialogProvider({ children }: { children: React.ReactNode }) {
	const [visible, setVisible] = useState(false)
	const [title, setTitle] = useState<string | undefined>()
	const [message, setMessage] = useState<string | undefined>()
	const [type, setType] = useState<DialogOptions['type']>('info')
	const buttonsRef = useRef<DialogButton[] | undefined>(undefined)
	const resolveRef = useRef<((i: number | null) => void) | null>(null)

	const showDialog = useCallback(async (opts: DialogOptions) => {
		return await new Promise<number | null>((resolve) => {
			setTitle(opts.title)
			setMessage(opts.message)
			setType(opts.type ?? 'info')
			buttonsRef.current = opts.buttons && opts.buttons.length > 0 ? opts.buttons : undefined
			resolveRef.current = resolve
			setVisible(true)
		})
	}, [])

	// register to service so external Alert.alert can call us
	useEffect(() => {
		dialogService.register(showDialog)
	}, [showDialog])

	const onClose = (index: number | null) => {
		setVisible(false)
		const r = resolveRef.current
		resolveRef.current = null
		if (r) r(index)
	}

	const renderIcon = () => {
		const size = 36
		switch (type) {
			case 'error':
				return <XCircle size={size} color="#c62828" />
			case 'success':
				return <CheckCircle size={size} color="#2e7d32" />
			case 'confirm':
				return <Warning size={size} color="#ef6c00" />
			default:
				return <Info size={size} color="#1565c0" />
		}
	}

	const defaultButtons = () => {
		if (buttonsRef.current && buttonsRef.current.length > 0) return buttonsRef.current
		return [{ text: 'حسناً' }]
	}

	return (
		<DialogContext.Provider value={{ showDialog }}>
			{children}

			<Modal transparent visible={visible} animationType="fade">
				<View style={styles.backdrop}>
					<Animated.View style={styles.container}>
						<View style={styles.icon}>{renderIcon()}</View>
						{title ? <Text style={styles.title}>{title}</Text> : null}
						{message ? <Text style={styles.message}>{message}</Text> : null}

						<View style={styles.buttonsRow}>
							{defaultButtons().map((b, i) => (
								<TouchableOpacity
									key={i}
									onPress={() => {
										try { b.onPress && b.onPress() } catch (e) {}
										onClose(i)
									}}
									style={[styles.btn, i === 0 ? styles.primaryBtn : styles.secondaryBtn]}
									activeOpacity={0.8}
								>
									<Text style={[styles.btnText, i === 0 ? styles.primaryText : styles.secondaryText]}>{b.text}</Text>
								</TouchableOpacity>
							))}
						</View>
					</Animated.View>
				</View>
			</Modal>
		</DialogContext.Provider>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	container: {
		width: '100%',
		maxWidth: 520,
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 18,
		alignItems: 'flex-end',
		// Arabic / RTL friendly
	},
	icon: {
		position: 'absolute',
		left: 18,
		top: 18,
	},
	title: {
		fontSize: 18,
		fontFamily: 'bold',
		color: theme.colors.text.primary,
		textAlign: 'right',
		marginBottom: 6,
	},
	message: {
		fontSize: 14,
		fontFamily: 'regular',
		color: theme.colors.text.secondary,
		textAlign: 'right',
		marginBottom: 14,
	},
	buttonsRow: {
		flexDirection: 'row-reverse',
		gap: 8,
		alignSelf: 'stretch',
		justifyContent: 'flex-end',
	},
	btn: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 10,
		minWidth: 88,
		alignItems: 'center',
	},
	primaryBtn: {
		backgroundColor: theme.colors.primary,
	},
	secondaryBtn: {
		backgroundColor: '#f2f2f2',
	},
	btnText: {
		fontFamily: 'bold',
	},
	primaryText: {
		color: '#fff',
	},
	secondaryText: {
		color: theme.colors.text.primary,
	},
})
