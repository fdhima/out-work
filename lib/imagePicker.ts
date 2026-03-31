import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'

type PickImageOptions = {
  multiple?: boolean
  limit?: number
  aspect?: [number, number]
  quality?: number
}

async function normalizeAsset(
  asset: ImagePicker.ImagePickerAsset,
  quality: number
): Promise<ImagePicker.ImagePickerAsset> {
  const isHeic = asset.uri.toLowerCase().includes('.heic') ||
    asset.mimeType === 'image/heic' ||
    asset.mimeType === 'image/heif'

  if (!isHeic) return asset

  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  )
  return { ...asset, uri: result.uri, mimeType: 'image/jpeg' }
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

  return Promise.all(result.assets.map((a) => normalizeAsset(a, quality)))
}
