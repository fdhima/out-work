// import { ThemedText } from '@/components/themed-text'
// import { ThemedView } from '@/components/themed-view'
// import { useColorScheme } from '@/hooks/use-color-scheme'
// import { useThemeColor } from '@/hooks/use-theme-color'
// // import '@/services/places'
// import { useState } from 'react'
// import {
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native'

// // import { getPasswordByUsername, patchUser } from '@/services/api'
// // import { getUserData, getUserId, login } from '@/services/auth'

// export default function ProfileScreen() {
//   // const router = useRouter()

//   const colorScheme = useColorScheme() ?? 'light'
//   const textColor = useThemeColor({}, 'text')
//   const tintColor = useThemeColor({}, 'tint')
//   const iconColor = useThemeColor({}, 'icon')

//   const [username, setUsername] = useState('')
//   const [email, setEmail] = useState('')
//   const [currentUsername, setCurrentUsername] = useState('')
//   const [currentEmail, setCurrentEmail] = useState('')
//   const [currentPassword, setCurrentPassword] = useState('')
//   const [newPassword, setNewPassword] = useState('')
//   const [confirmPassword, setConfirmPassword] = useState('')
//   const [error, setError] = useState('')

//   // /* ---------------------------------- */
//   // /* Validation                         */
//   // /* ---------------------------------- */
//   // const validateForm = async () => {
//   //   if (!currentPassword) {
//   //     setError('Update requires current password')
//   //     return false
//   //   }

//   //   // const storedHash = await getPasswordByUsername(currentUsername)
//   //   const storedHash = 'dasdasdasdas'
//   //   const inputHash = sha256(currentPassword)

//   //   if (inputHash !== storedHash) {
//   //     setError('Current password is incorrect')
//   //     return false
//   //   }

//   //   if (newPassword && newPassword !== confirmPassword) {
//   //     setError('New passwords do not match')
//   //     return false
//   //   }

//   //   if (newPassword && newPassword.length < 8) {
//   //     setError('New password must be at least 8 characters long')
//   //     return false
//   //   }

//   //   if (email) {
//   //     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//   //     if (!emailRegex.test(email)) {
//   //       setError('Please enter a valid email address')
//   //       return false
//   //     }
//   //   }

//   //   setError('')
//   //   return true
//   // }

//   // /* ---------------------------------- */
//   // /* Update Profile                     */
//   // /* ---------------------------------- */
//   // const updateProfile = async () => {
//   //   if (!(await validateForm())) return

//   //   try {
//   //     const userId = await getUserId()

//   //     await patchUser(
//   //       userId,
//   //       username || undefined,
//   //       email || undefined,
//   //       newPassword || undefined
//   //     )

//   //     await login(
//   //       username || currentUsername,
//   //       newPassword || currentPassword
//   //     )

//   //   } catch (err: any) {
//   //     setError(err.message || 'Failed to update profile')
//   //   }
//   // }

//   // /* ---------------------------------- */
//   // /* Load User                          */
//   // /* ---------------------------------- */
//   // useEffect(() => {
//   //   const loadUser = async () => {
//   //     try {
//   //       const userData = await getUserData()
//   //       setCurrentUsername(userData.username)
//   //       setCurrentEmail(userData.email)
//   //     } catch {
//   //       setError('Failed to load user data')
//   //     }
//   //   }

//   //   loadUser()
//   // }, [])

//   /* ---------------------------------- */
//   /* UI                                 */
//   /* ---------------------------------- */
//   return (
//     <ThemedView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={styles.keyboardView}
//       >
//         <ScrollView
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//         >
//           <View
//             style={[
//               styles.card,
//               {
//                 backgroundColor:
//                   colorScheme === 'dark'
//                     ? 'rgba(255, 255, 255, 0.08)'
//                     : 'rgba(255, 255, 255, 0.95)',
//               },
//             ]}
//           >
//             <ThemedText type="title" style={styles.title}>
//               Edit Profile
//             </ThemedText>
//             <ThemedText type="subtitle" style={styles.subtitle}>
//               Update your profile information below.
//             </ThemedText>

//             <Input
//               label="Username"
//               placeholder={currentUsername || 'Enter username'}
//               value={username}
//               onChangeText={setUsername}
//               textColor={textColor}
//               iconColor={iconColor}
//               backgroundColor={
//                 colorScheme === 'dark'
//                   ? 'rgba(255, 255, 255, 0.1)'
//                   : '#f3f4f6'
//               }
//             />

//             <Input
//               label="Email"
//               placeholder={currentEmail || 'Enter email'}
//               value={email}
//               onChangeText={setEmail}
//               keyboardType="email-address"
//               textColor={textColor}
//               iconColor={iconColor}
//               backgroundColor={
//                 colorScheme === 'dark'
//                   ? 'rgba(255, 255, 255, 0.1)'
//                   : '#f3f4f6'
//               }
//             />

//             <Input
//               label="Current Password"
//               placeholder="Enter current password"
//               secureTextEntry
//               value={currentPassword}
//               onChangeText={setCurrentPassword}
//               textColor={textColor}
//               iconColor={iconColor}
//               backgroundColor={
//                 colorScheme === 'dark'
//                   ? 'rgba(255, 255, 255, 0.1)'
//                   : '#f3f4f6'
//               }
//             />

//             <Input
//               label="New Password (Optional)"
//               placeholder="Enter new password"
//               secureTextEntry
//               value={newPassword}
//               onChangeText={setNewPassword}
//               textColor={textColor}
//               iconColor={iconColor}
//               backgroundColor={
//                 colorScheme === 'dark'
//                   ? 'rgba(255, 255, 255, 0.1)'
//                   : '#f3f4f6'
//               }
//             />

//             <Input
//               label="Confirm New Password"
//               placeholder="Confirm new password"
//               secureTextEntry
//               editable={!!newPassword}
//               value={confirmPassword}
//               onChangeText={setConfirmPassword}
//               textColor={textColor}
//               iconColor={iconColor}
//               backgroundColor={
//                 colorScheme === 'dark'
//                   ? 'rgba(255, 255, 255, 0.1)'
//                   : '#f3f4f6'
//               }
//             />

//             {error ? (
//               <ThemedText style={[styles.error, { color: '#ef4444' }]}>
//                 {error}
//               </ThemedText>
//             ) : null}

//             <View style={styles.actions}>
//               <TouchableOpacity
//                 style={[
//                   styles.cancel,
//                   {
//                     backgroundColor:
//                       colorScheme === 'dark'
//                         ? 'rgba(255, 255, 255, 0.15)'
//                         : '#e5e7eb',
//                   },
//                 ]}
//               >
//                 <ThemedText style={styles.cancelText}>Cancel</ThemedText>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[styles.save, { backgroundColor: tintColor }]}
//               >
//                 <ThemedText
//                   style={styles.saveText}
//                   lightColor="#fff"
//                   darkColor="#fff"
//                 >
//                   Save Changes
//                 </ThemedText>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </ThemedView>
//   )
// }

// /* ---------------------------------- */
// /* Reusable Input                     */
// /* ---------------------------------- */
// interface InputProps {
//   label: string
//   textColor: string
//   iconColor: string
//   backgroundColor: string
//   [key: string]: any
// }

// function Input({
//   label,
//   textColor,
//   iconColor,
//   backgroundColor,
//   ...props
// }: InputProps) {
//   return (
//     <View style={styles.inputGroup}>
//       <ThemedText style={styles.label}>{label}</ThemedText>
//       <TextInput
//         {...props}
//         style={[
//           styles.input,
//           {
//             backgroundColor,
//             color: textColor,
//             borderColor:
//               backgroundColor === 'rgba(255, 255, 255, 0.1)'
//                 ? 'rgba(255, 255, 255, 0.2)'
//                 : 'transparent',
//           },
//         ]}
//         placeholderTextColor={iconColor}
//       />
//     </View>
//   )
// }

// /* ---------------------------------- */
// /* Styles                             */
// /* ---------------------------------- */
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   keyboardView: {
//     flex: 1,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     padding: 16,
//     paddingTop: 24,
//     paddingBottom: 32,
//   },
//   card: {
//     borderRadius: 20,
//     padding: 24,
//     paddingBottom: 28,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 12,
//     elevation: 8,
//     gap: 8,
//   },
//   title: {
//     textAlign: 'center',
//     marginBottom: 8,
//     fontSize: 32,
//   },
//   subtitle: {
//     textAlign: 'center',
//     marginBottom: 32,
//     opacity: 0.7,
//     fontSize: 16,
//     fontWeight: '400',
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   label: {
//     marginBottom: 8,
//     fontSize: 15,
//     fontWeight: '600',
//     opacity: 0.9,
//   },
//   input: {
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     minHeight: 52,
//     borderWidth: 1,
//   },
//   error: {
//     textAlign: 'center',
//     marginVertical: 16,
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   actions: {
//     flexDirection: 'column',
//     gap: 12,
//     marginTop: 8,
//   },
//   cancel: {
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 12,
//     minHeight: 52,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   cancelText: {
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   save: {
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 12,
//     minHeight: 52,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#0a7ea4',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 6,
//   },
//   saveText: {
//     fontWeight: '600',
//     fontSize: 16,
//   },
// })
import { useAuth } from '@/context/AuthContext'
import { Button, Text, View } from 'react-native'

export default function Profile() {
  const { session, signOut } = useAuth()

  return (
    <View>
      <Text>{session?.user.email}</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  )
}
