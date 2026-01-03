import * as ImagePicker from 'expo-image-picker'

type PickImageOptions = {
  multiple?: boolean
  limit?: number
  aspect?: [number, number]
  quality?: number
}

export async function pickImages({
  multiple = false,
  limit = 1,
  aspect,
  quality = 0.8,
}: PickImageOptions = {}) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Media library permission denied')
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? limit : 1,
    allowsEditing: !multiple,
    aspect,
    quality,
  })

  if (result.canceled) return []

  return result.assets
}
